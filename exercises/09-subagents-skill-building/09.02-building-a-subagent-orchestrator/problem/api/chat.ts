import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  type UIMessage,
} from 'ai';
import z from 'zod';
import { schedulerAgent } from './agents/scheduler-agent.ts';
import { songFinderAgent } from './agents/song-finder-agent.ts';
import { studentNotesManagerAgent } from './agents/student-notes-manager.ts';
import { todosAgent } from './agents/todos-agent.ts';

export type MyMessage = UIMessage<unknown, {}>;

const subagents = {
  'todos-agent': todosAgent,
  'student-notes-manager': studentNotesManagerAgent,
  'song-finder-agent': songFinderAgent,
  'scheduler-agent': schedulerAgent,
};

const getSystemPrompt = () => {
  return `
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
  `;
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      // TODO: call generateObject to generate a list of tasks.
      // These tasks should be an array of objects with the following
      // properties:
      // - subagent: the name of the subagent to use
      // - task: the task to perform
      //
      // The system prompt is in the getSystemPrompt function above.
      // The messages should be passed using convertToModelMessages.
      const tasksResult = TODO;

      const tasks = tasksResult.object.tasks;

      // TODO: Test the tasks by logging them to the console.
      // We'll look at streaming them to the frontend in
      // the next exercise.
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
