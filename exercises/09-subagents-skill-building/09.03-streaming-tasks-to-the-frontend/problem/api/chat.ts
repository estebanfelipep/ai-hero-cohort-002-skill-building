import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  streamObject,
  streamText,
  type UIMessage,
} from 'ai';
import z from 'zod';
import { schedulerAgent } from './agents/scheduler-agent.ts';
import { songFinderAgent } from './agents/song-finder-agent.ts';
import { studentNotesManagerAgent } from './agents/student-notes-manager.ts';
import { todosAgent } from './agents/todos-agent.ts';

export type MyMessage = UIMessage<
  unknown,
  {
    // TODO: Define a 'data-task' type that will
    // be used to store the tasks our main agent
    // delegates to the subagents.
    // Tasks should have the following fields:
    // - id: the id of the task
    // - subagent: the name of the subagent that will perform the task
    // - task: the task to perform
    // - output: the output of the task
    task: TODO;
  }
>;

const subagents = {
  'todos-agent': todosAgent,
  'student-notes-manager': studentNotesManagerAgent,
  'song-finder-agent': songFinderAgent,
  'scheduler-agent': schedulerAgent,
};


export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      // TODO: Swap this over to streamObject instead of generateObject.
      const tasksResult = await generateObject({
        model: google('gemini-2.0-flash'),
        system: `
          You are a helpful assistant that manages a multi-agent system.
          You will be given a conversation history and the user's initial prompt.

          The current date is ${new Date().toISOString()}.

          You have access to four subagents:

          - todos-agent: This agent manages a list of todos.
          - student-notes-manager: This agent manages a list of student notes.
          - song-finder-agent: This agent finds songs using the web.
          - scheduler-agent: This agent manages a calendar.

          You will return a list of tasks to delegate to the subagents.
          These tasks will be executed in parallel.

          Subagents can handle complicated tasks, so don't be afraid to delegate large tasks to them.

          This means that inter-dependent tasks (like finding X and using X to create Y) should be split into two tasks.

          Think step-by-step - first decide what tasks need to be performed,
          then decide which subagent to use for each task.
        `,
        messages: convertToModelMessages(messages),
        schema: z.object({
          tasks: z.array(
            z.object({
              subagent: z
                .enum([
                  'todos-agent',
                  'student-notes-manager',
                  'song-finder-agent',
                  'scheduler-agent',
                ])
                .describe('The subagent to use'),
              task: z
                .string()
                .describe(
                  'A detailed description of the task to perform',
                ),
            }),
          ),
        }),
      });

      // NOTE: Now, we're streaming in the tasks to the client
      // as they are generated. So that we get a stable
      // reference for each task, we create a map of indexes
      // (where the index is the index of the task in the array)
      // to a unique id, which we can use to pass to the writer.
      const indexToIdMap = new Map<number, string>();

      for await (const chunk of tasksResult.partialObjectStream) {
        const tasks = chunk.tasks ?? [];

        tasks.forEach((task, index) => {
          if (!indexToIdMap.has(index)) {
            indexToIdMap.set(index, crypto.randomUUID());
          }

          // This is the id of the task.
          const id = indexToIdMap.get(index)!;

          // TODO: Write the task to the client, using writer.write,
          // remembering to pass in the id above.
          // If we don't pass in an id, a new data part will
          // be created for each task update - potentially
          // spewing out a LOT of half-formed crud in the UI.
          writer.write(TODO);
        });
      }

      // TODO: Remember to await the tasksResult.object
      const tasks = tasksResult.object.tasks;

      console.dir(tasks);
    },
    onError(error) {
      console.error(error);
      return 'An error occurred while finding the song.';
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
