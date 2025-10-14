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


export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      // NOTE: We'll be using this to track the number of steps
      // we've taken.
      let step = 0;

      // TODO: Create a diary data structure to keep track of the
      // work performed so far.
      // In the solution, I've used a simple string to track
      // the work performed so far, which is simple appended to.
      let diary = TODO;

      // NOTE: We'll run this loop until we've taken 10 steps.
      // This prevents the loop from running forever.
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
          `,
          // TODO: Pass the diary into the prompt so that the
          // orchestrator can track the work performed so far
          // and plan the next step.
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

        // NOTE: If there are no tasks, we'll break out of the loop.
        if (tasks.length === 0) {
          break;
        }

        // NOTE: For easier consumption by the subagents,
        // we'll add the ids to the tasks.
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
              // TODO: Call the subagent with the task.task as the prompt.
              // The result should be the output of the subagent.
              const result = TODO;

              // TODO: Write the updated task to the client,
              // using writer.write, remembering to pass in the id.
              writer.write(TODO);

              // TODO: Update the diary with the new result.
              diary = TODO;
            } catch (error) {
              // TODO: If the task fails, write the error to the client,
              // using writer.write, remembering to pass in the id.
              writer.write(TODO);

              // TODO: Update the diary with the new error.
              diary = TODO;
            }
          }),
        );

        step++;
      }
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
