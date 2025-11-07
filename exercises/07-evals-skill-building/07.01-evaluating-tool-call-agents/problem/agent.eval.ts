import { stepCountIs, type UIMessage } from 'ai';
import { evalite } from 'evalite';
import { runAgent } from './agent.ts';
import { google } from '@ai-sdk/google';

evalite.each([
  {
    name: 'Gemini 2.5 Flash',
    input: google('gemini-2.5-flash'),
  },
  {
    name: 'Gemini 2.0 Flash',
    input: google('gemini-2.0-flash'),
  },
  {
    name: 'Gemini 2.0 Flash Lite',
    input: google('gemini-2.0-flash-lite'),
  },
])('Agent Tool Call Evaluation', {
  data: [
    {
      input: ['What is the weather in San Francisco right now?'],
      expected: {
        tool: 'checkWeather',
      },
    },
    {
      input: [
        `Send an email to john@example.com about the meeting tomorrow saying that I can't make it because I'm sick.`,
      ],
      expected: {
        tool: 'sendEmail',
      },
    },
    {
      input: [
        `Create a new task to finish the project report by Friday.`,
        'What priority should I set this task to?',
        'Set it to high priority.',
      ],
      expected: {
        tool: 'createTask',
      },
    },
    {
      input: [
        `Book a flight from New York to London on March 15th.`,
        'How many passengers and what class would you like to book?',
        '1 passenger in business class.',
        'Could you please specify the year for March 15th?',
        '2025.',
      ],
      expected: {
        tool: 'bookFlight',
      },
    },
    {
      input: [
        `Translate this text to Spanish: Hello, how are you?`,
      ],
      expected: {
        tool: 'translateText',
      },
    },
    {
      input: [
        `Search the web for the latest news on AI developments.`,
      ],
      expected: {
        tool: 'searchWeb',
      },
    },
    {
      input: [
        `I need to cancel my meeting with John on Wednesday.`,
      ],
      expected: {
        tool: 'searchCalendarEvents',
      },
    },
  ],
  task: async (input, model) => {
    const messages: UIMessage[] = input.map((message, index) => {
      return {
        id: '1',
        role: index % 2 === 0 ? 'user' : 'assistant',
        parts: [{ type: 'text', text: message }],
      };
    });

    const result = runAgent(model, messages, stepCountIs(1));

    await result.consumeStream();

    const toolCalls = (await result.toolCalls).map(
      (toolCall) => {
        return {
          toolName: toolCall.toolName,
          input: toolCall.input,
        };
      },
    );

    return {
      toolCalls,
      text: await result.text,
    };
  },
  scorers: [
    {
      name: 'Matches Expected Tool',
      description: 'The agent called the expected tool',
      scorer: ({ output, expected }) => {
        return output.toolCalls.some(
          (toolCall) => toolCall.toolName === expected?.tool,
        )
          ? 1
          : 0;
      },
    },
  ],
});
