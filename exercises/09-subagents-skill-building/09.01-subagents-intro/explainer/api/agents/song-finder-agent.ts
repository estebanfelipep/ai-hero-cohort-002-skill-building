import {
  stepCountIs,
  streamText,
  tool,
  type ModelMessage,
} from 'ai';

import { google } from '@ai-sdk/google';
import { tavily } from '@tavily/core';
import z from 'zod';
import { formatModelMessages } from '../utils.ts';

export const songFinderAgent = async (opts: {
  messages: ModelMessage[];
}) => {
  const tavilyClient = tavily({
    apiKey: process.env.TAVILY_API_KEY,
  });

  const streamResult = streamText({
    model: google('gemini-2.0-flash'),
    system: `
      You are a helpful assistant that finds songs.
      You're mostly being used by singing teachers who need to find songs for their students.
      You will be given a prompt and you will need to find the song.
      You will need to use the Tavily API to find the song, using your searchWeb tool.
      You will need to return the song name, artist, and album.
    `,
    messages: opts.messages,
    tools: {
      searchWeb: tool({
        description: 'Search the web for information',
        inputSchema: z.object({
          q: z
            .string()
            .describe('The query to search the web for'),
        }),
        execute: async ({ q }) => {
          const result = await tavilyClient.search(q, {
            maxResults: 5,
          });

          return result.results
            .map((result, index) =>
              [
                `## Result ${index + 1}: ${result.title}`,
                `${result.url}`,
                `Published on ${result.publishedDate}`,
                `<content>`,
                `${result.content}`,
                `</content>`,
              ].join('\n\n'),
            )
            .join('\n\n');
        },
      }),
    },
    stopWhen: stepCountIs(10),
  });

  await streamResult.consumeStream();

  const finalMessages = (await streamResult.response).messages;

  return formatModelMessages(finalMessages);
};
