import {
  stepCountIs,
  streamText,
  tool,
  type ModelMessage,
} from 'ai';

import { google } from '@ai-sdk/google';
import { join } from 'node:path';
import z from 'zod';
import { createPersistenceLayer } from '../create-persistence-layer.ts';
import { formatModelMessages } from '../utils.ts';

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

const todosDb = createPersistenceLayer<{
  todos: {
    [todoId: string]: Todo;
  };
}>({
  databasePath: join(process.cwd(), 'todos.json'),
  defaultDatabase: {
    todos: {},
  },
});

const formatTodos = (todos: Todo[]) => {
  return todos
    .map((todo) =>
      [
        `## ${todo.title}`,
        `ID: ${todo.id}`,
        `Completed: ${todo.completed}`,
        `Created at: ${todo.createdAt}`,
        `Updated at: ${todo.updatedAt}`,
      ].join('\n'),
    )
    .join('\n\n');
};

export const todosAgent = async (opts: {
  messages: ModelMessage[];
}) => {
  const db = await todosDb.loadDatabase();
  const outstandingTodos = Object.values(db.todos).filter(
    (todo) => !todo.completed,
  );

  const streamResult = streamText({
    model: google('gemini-2.0-flash'),
    system: `
      You are a helpful assistant that manages a list of todos.

      You have access to the following tools:

      - createTodos: Create one or more todos
      - updateTodo: Update an existing todo
      - deleteTodo: Delete an existing todo

      You will be given a prompt, and you will need to use the tools to manage the todos.

      Never show the IDs to the user; they are for internal use only.

      The current date and time is ${new Date().toISOString()}.

      The current outstanding todos are:

      ${formatTodos(outstandingTodos)}
    `,
    messages: opts.messages,
    tools: {
      createTodos: tool({
        description: 'Create a new todo',
        inputSchema: z.object({
          todos: z.array(
            z.object({
              title: z.string(),
            }),
          ),
        }),
        execute: async (input) => {
          const todos = input.todos.map((todo) => ({
            id: crypto.randomUUID(),
            title: todo.title,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          await todosDb.updateDatabase((db) => {
            todos.forEach((todo) => {
              db.todos[todo.id] = todo;
            });
          });

          return [
            `Todos created successfully`,
            ...todos.map(
              (todo) => `- ${todo.title} (${todo.id})`,
            ),
          ].join('\n');
        },
      }),
      updateTodo: tool({
        description: 'Update an existing todo',
        inputSchema: z.object({
          id: z.string(),
          title: z
            .string()
            .optional()
            .describe(
              'The title of the todo - only include if you want to change it',
            ),
          completed: z
            .boolean()
            .optional()
            .describe(
              'Whether the todo is completed - only include if you want to change it',
            ),
        }),
        execute: async (input) => {
          const db = await todosDb.loadDatabase();

          const todo = db.todos[input.id];

          if (!todo) {
            return `Todo with ID ${input.id} not found`;
          }

          await todosDb.updateDatabase((db) => {
            db.todos[input.id] = {
              ...todo,
              ...input,
              updatedAt: new Date().toISOString(),
            };
          });

          return 'Todo updated successfully';
        },
      }),
      deleteTodo: tool({
        description: 'Delete an existing todo',
        inputSchema: z.object({
          id: z.string(),
        }),
        execute: async (input) => {
          const db = await todosDb.loadDatabase();

          if (!db.todos[input.id]) {
            return `Todo with ID ${input.id} not found`;
          }

          await todosDb.updateDatabase((db) => {
            delete db.todos[input.id];
          });

          return 'Todo deleted successfully';
        },
      }),
    },
    stopWhen: stepCountIs(10),
  });

  await streamResult.consumeStream();

  const finalMessages = (await streamResult.response).messages;

  return formatModelMessages(finalMessages);
};
