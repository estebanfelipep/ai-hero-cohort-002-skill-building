import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  generateObject,
  streamText,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import {
  loadMemories,
  saveMemories,
  type DB,
} from './memory-persistence.ts';

export type MyMessage = UIMessage<unknown, {}>;


const formatMemory = (memory: DB.MemoryItem) => {
  return [
    `Memory: ${memory.memory}`,
    `Created At: ${memory.createdAt}`,
  ].join('\n');
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  // TODO: Use the loadMemories function to load the memories from the database
  const memories = TODO;

  // TODO: Format the memories to display in the UI using the formatMemory function
  const memoriesText = TODO;

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const result = streamText({
        model: google('gemini-2.0-flash-lite'),
        system: `You are a helpful assistant that can answer questions and help with tasks.

        The date is ${new Date().toISOString().split('T')[0]}.

        You have access to the following memories:

        <memories>
        ${memoriesText}
        </memories>
        `,
        messages: convertToModelMessages(messages),
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async (response) => {
      const allMessages = [...messages, ...response.messages];

      // TODO: Generate the memories using the generateObject function
      // Pass it the entire message history and the existing memories
      // Write a system prompt that tells the LLM to only focus on permanent memories
      // and not temporary or situational information
      const memoriesResult = TODO;

      const newMemories = memoriesResult.object.memories;

      // TODO: Save the new memories to the database using the saveMemories function
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
