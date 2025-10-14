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
import { summarizeAgentOutput } from './summarize-agent-output.ts';

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

const getPlanSystemPrompt = () => {
  return `
    You are a helpful assistant that manages a multi-agent system.

    This multi-agent system is designed to help singing teachers manage their students.


    You will be given a conversation history and the user's initial prompt.
    You will need to generate a plan for the next steps.

    The current date is ${new Date().toISOString()}.

    This plan should be in multiple steps.

    You have access to four subagents:

    - todos-agent: This agent manages a list of todos.
    - student-notes-manager: This agent manages a list of student notes.
    - song-finder-agent: This agent finds songs using the web.
    - scheduler-agent: This agent manages a calendar.

    You will describe in plain English what steps the system should take
    in order to achieve the user's goal.

    This should be in the form of an ordered list of steps, like a todo list.

    1. Do the first thing
    2. Do the second thing
    3. Do the third thing, which requires the output of the first thing
    4. Do the fourth thing, which requires the output of the second thing

    Multiple agents can be run in parallel.

    If you are asked about a student, fetch their notes before performing any other tasks.
  `;
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      let diary = '';
      let step = 0;

      // TODO: Before the loop, call streamText to generate a plan.
      // Use the getPlanSystemPrompt function to create the system prompt.
      // Pass in convertToModelMessages(messages) as the messages.
      const planResult = TODO;

      // TODO: Write the plan to the client by monitoring the plan's
      // textStream.
      // You can either use a custom data part for this, or use
      // reasoning-start, reasoning-delta, and reasoning-end.
      // These work the same as text-start, text-delta, and text-end,
      // but are for reasoning parts.
      TODO;

      // TODO: Update the diary with the plan.
      diary = TODO;

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

            ${diary}
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

              let summary = '';

              await summarizeAgentOutput({
                initialPrompt: convertToModelMessages(messages),
                agentOutput: result,
                onSummaryDelta: (delta) => {
                  summary += delta;
                  writer.write({
                    type: 'data-task',
                    id: task.id,
                    data: {
                      id: task.id,
                      subagent: task.subagent,
                      task: task.task,
                      output: delta,
                    },
                  });
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
                summary,
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

      const result = streamText({
        model: google('gemini-2.0-flash'),
        system: `
          The current date and time is ${new Date().toISOString()}.

          You are a helpful assistant that summarizes the results of a multi-agent system.

          You will be given a diary of the work performed so far and the user's initial prompt.

          You should provide a summary of the tasks performed and provide the results to the user.

          The diary of the work performed so far:

          ${diary}
        `,
        messages: convertToModelMessages(messages),
      });

      const textPartId = crypto.randomUUID();

      writer.write({
        type: 'text-start',
        id: textPartId,
      });

      for await (const chunk of result.textStream) {
        writer.write({
          type: 'text-delta',
          id: textPartId,
          delta: chunk,
        });
      }

      writer.write({
        type: 'text-end',
        id: textPartId,
      });

      await result.consumeStream();
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
