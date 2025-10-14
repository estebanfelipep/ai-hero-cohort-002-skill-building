import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
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
    task: {
      id: string;
      subagent: string;
      task: string;
      // The diary entry
      output: string;
    };
  }
>;

const subagents = {
  'todos-agent': todosAgent,
  'student-notes-manager': studentNotesManagerAgent,
  'song-finder-agent': songFinderAgent,
  'scheduler-agent': schedulerAgent,
};

const getSummarizeSystemPrompt = () => {
  return `
    The current date and time is ${new Date().toISOString()}.

    You are a helpful assistant that summarizes the results of a multi-agent system.

    You will be given a diary of the work performed so far and the user's initial prompt.

    You should provide a summary of the tasks performed and provide the results to the user.
  `;
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      let diary = '';
      let step = 0;

      while (step < 10) {
        const tasksResult = streamObject({
          model: google('gemini-2.0-flash'),
          system: `
            You are a helpful assistant that manages a multi-agent system.
            You will be given a conversation history and the user's initial prompt.
            You will also be given a plan to follow.

            The current date is ${new Date().toISOString()}.

            You must follow the plan exactly, and generate the _next_ step only.

            If the plan is complete, return an empty list of tasks.

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

            The diary of the work performed so far:

            ${diary ?? 'No work has been performed yet.'}
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

        const indexToIdMap = new Map<number, string>();

        for await (const chunk of tasksResult.partialObjectStream) {
          const tasks = chunk.tasks ?? [];

          tasks.forEach((task, index) => {
            if (!indexToIdMap.has(index)) {
              indexToIdMap.set(index, crypto.randomUUID());
            }

            const id = indexToIdMap.get(index)!;

            writer.write({
              type: 'data-task',
              id,
              data: {
                id,
                subagent: task?.subagent ?? '',
                task: task?.task ?? '',
                output: '',
              },
            });
          });
        }

        const tasks = (await tasksResult.object).tasks;

        if (tasks.length === 0) {
          break;
        }

        const tasksWithIds = tasks.map((task, index) => {
          return {
            id: indexToIdMap.get(index)!,
            ...task,
          };
        });

        await Promise.all(
          tasksWithIds.map(async (task) => {
            const subagent = subagents[task.subagent];

            if (!subagent) {
              throw new Error(
                `Unknown subagent: ${task.subagent}`,
              );
            }

            try {
              const result = await subagent({
                prompt: task.task,
              });

              writer.write({
                type: 'data-task',
                id: task.id,
                data: {
                  id: task.id,
                  subagent: task.subagent,
                  task: task.task,
                  output: result,
                },
              });

              diary = [
                diary,
                '',
                `The ${task.subagent} subagent was asked to perform the following task:`,
                `<task>`,
                task.task,
                `</task>`,
                `The subagent provided the following output:`,
                `<output>`,
                result,
                `</output>`,
              ].join('\n');
            } catch (error) {
              writer.write({
                type: 'data-task',
                id: task.id,
                data: {
                  id: task.id,
                  subagent: task.subagent,
                  task: task.task,
                  output: `Error: ${error}`,
                },
              });

              diary = [
                diary,
                '',
                `The ${task.subagent} subagent was asked to perform the following task:`,
                `<task>`,
                task.task,
                `</task>`,
                `The subagent failed to perform the task:`,
                `<output>`,
                `Error: ${error}`,
                `</output>`,
              ].join('\n');
            }
          }),
        );

        step++;
      }

      // TODO: Call streamText to summarize the results of the
      // multi-agent system. Use the getSummarizeSystemPrompt
      // function to get the system prompt. Use convertToModelMessages(messages)
      // and diary to create the prompt.
      const summarizeResult = TODO;

      // TODO: Write the summary to the client, either by manually
      // writing the text parts or by using .toUIMessageStream()
      // and calling writer.merge() to merge the text parts.
      TODO;
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
