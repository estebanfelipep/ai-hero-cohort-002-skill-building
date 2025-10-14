import { stepCountIs, streamText, tool, type ModelMessage } from 'ai';

import { google } from '@ai-sdk/google';
import { join } from 'node:path';
import z from 'zod';
import { createPersistenceLayer } from '../create-persistence-layer.ts';
import { formatModelMessages } from '../utils.ts';

type Student = {
  id: string;
  name: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
};

const notesDb = createPersistenceLayer<{
  students: {
    [studentId: string]: Student;
  };
}>({
  databasePath: join(process.cwd(), 'student-notes.json'),
  defaultDatabase: {
    students: {},
  },
});

const formatStudentNotes = (studentNotes: Student[]) => {
  return studentNotes
    .map((student) =>
      [
        `## ${student.name}`,
        `ID: ${student.id}`,
        `Created at: ${student.createdAt}`,
        `Updated at: ${student.updatedAt}`,
        `<notes>`,
        student.notes,
        `</notes>`,
      ].join('\n'),
    )
    .join('\n\n');
};

export const studentNotesManagerAgent = async (opts: {
  messages: ModelMessage[];
}) => {
  const db = await notesDb.loadDatabase();

  const studentNotesAsArray = Object.values(db.students);

  const streamResult = streamText({
    model: google('gemini-2.0-flash'),
    system: `
      You are a helpful assistant that manages student notes.
      The user is the singing teacher, and you are a helpful assistant that manages their student notes.
      You may be asked to search for information, or to add notes to the student's notes.

      Never show the IDs to the user; they are for internal use only.

      In their current state, the notes are:

      ${formatStudentNotes(studentNotesAsArray)}
    `,
    messages: opts.messages,
    tools: {
      appendToStudentNotes: tool({
        description: "Append to a student's notes",
        inputSchema: z.object({
          studentId: z.string(),
          note: z
            .string()
            .describe(
              "The note to append to the student's notes.",
            ),
        }),
        execute: async ({ studentId, note }) => {
          if (!db.students[studentId]) {
            return 'Could not append note - student not found with that id.';
          }

          await notesDb.updateDatabase((db) => {
            const student = db.students[studentId]!;
            db.students[studentId] = {
              ...student,
              notes: [...student.notes, note],
              updatedAt: new Date().toISOString(),
            };
          });

          return `Success.`;
        },
      }),
      createStudent: tool({
        description: 'Create a new student',
        inputSchema: z.object({
          name: z.string(),
          note: z
            .string()
            .describe("The note to add to the student's notes."),
        }),
        execute: async ({ name, note }) => {
          const studentId = crypto.randomUUID();
          await notesDb.updateDatabase((db) => {
            db.students[studentId] = {
              id: studentId,
              name,
              notes: [note],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          });

          return `Success. Created student with id ${studentId}.`;
        },
      }),
    },
    stopWhen: stepCountIs(10),
  });

  await streamResult.consumeStream();

  const finalMessages = (await streamResult.response).messages;

  return formatModelMessages(finalMessages);
};
