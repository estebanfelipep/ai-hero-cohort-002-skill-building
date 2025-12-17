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
  deleteMemory,
  updateMemory,
  type DB,
} from './memory-persistence.ts';

export type MyMessage = UIMessage<unknown, {}>;

const formatMemory = (memory: DB.MemoryItem) => {
  return [
    `Memory: ${memory.memory}`,
    `ID: ${memory.id}`,
    `Created At: ${memory.createdAt}`,
  ].join('\n');
};

export const POST = async (req: Request): Promise<Response> => {
  const body: { messages: MyMessage[] } = await req.json();
  const { messages } = body;

  const memories = await loadMemories();

  const memoriesText = memories.map(formatMemory).join('\n\n');
  console.log('ep:', { memoriesText });
  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const result = streamText({
        model: google('gemini-2.0-flash-lite'),
        system: `You are a helpful assistant that can answer questions and help with tasks.

        The date is ${new Date().toISOString().split('T')[0]}.

        You have access to the following memories:

        <latest-memories>
        ${memoriesText}
        </latest-memories>
        `,
        messages: convertToModelMessages(messages),
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async (response) => {
      const allMessages = [...messages, ...response.messages];

      const memoriesResult = await generateObject({
        model: google('gemini-2.0-flash'),
        schema: z.object({
          updates: z
            .array(
              z.object({
                id: z
                  .string()
                  .describe(
                    'The ID of the existing memory to update',
                  ),
                memory: z
                  .string()
                  .describe('The updated memory content'),
              }),
            )
            .describe(
              'Array of existing memories that need to be updated with new information',
            ),
          deletions: z
            .array(z.string())
            .describe(
              'Array of memory IDs that should be deleted (outdated, incorrect, or no longer relevant)',
            ),
          additions: z
            .array(z.string())
            .describe(
              "Array of new memory strings to add to the user's permanent memory",
            ),
        }),
        // TODO: Update the system prompt to tell it to return updates,
        // deletions and additions
        system: `You are a memory extraction agent. Your task is to analyze the conversation history and extract permanent memories about the user.

        PERMANENT MEMORIES are facts about the user that:
        - Are unlikely to change over time (preferences, traits, characteristics)
        - Will remain relevant for weeks, months, or years
        - Include personal details, preferences, habits, or important information shared
        - Are NOT temporary or situational information

        EXAMPLES OF PERMANENT MEMORIES:
        - "User prefers dark mode interfaces"
        - "User works as a software engineer"
        - "User has a dog named Max"
        - "User is learning TypeScript"
        - "User prefers concise explanations"
        - "User lives in San Francisco"

        EXAMPLES OF WHAT NOT TO MEMORIZE:
        - "User asked about weather today" (temporary)
        - "User is currently debugging code" (situational)
        - "User said hello" (trivial interaction)

          MEMORY MANAGEMENT TASKS:
        1. ADDITIONS: Extract any new permanent memories from this conversation that aren't already covered by existing memories.
        2. UPDATES: Identify existing memories that need to be updated with new information (e.g., if user mentioned they moved cities, update their location memory).
        3. DELETIONS: Identify existing memories that are now outdated, incorrect, or no longer relevant based on new information in the conversation.

        For each memory operation:
        - Additions: Return concise, factual statements about the user
        - Updates: Provide the memory ID and the updated content
        - Deletions: Provide the memory ID of memories that should be removed

        Rules:
        - If the user explicitly asks to remove a memory, include that memory ID in the deletions array.

        EXISTING MEMORIES:
        ${memoriesText}
        `,
        messages: convertToModelMessages(allMessages),
      });

      const { updates, deletions, additions } =
        memoriesResult.object;

      console.log('Updates', updates);
      console.log('Deletions', deletions);
      console.log('Additions', additions);

      // Only delete memories that are not being updated
      const filteredDeletions = deletions.filter(
        (deletion) =>
          !updates.some((update) => update.id === deletion),
      );

      // TODO: Update the memories that need to be updated
      // by calling updateMemory for each update
      updates.forEach((update) =>
        updateMemory(update.id, {
          memory: update.memory,
          createdAt: new Date().toISOString(),
        }),
      );

      // TODO: Delete the memories that need to be deleted
      // by calling deleteMemory for each filtered deletion
      filteredDeletions.forEach((deletion) =>
        deleteMemory(deletion),
      );
      // TODO: Save the new memories by calling saveMemories
      // with the new memories
      saveMemories(
        additions.map((memory) => ({
          id: generateId(),
          memory,
          createdAt: new Date().toISOString(),
        })),
      );
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
};
