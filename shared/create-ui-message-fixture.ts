import type { UIMessage } from 'ai';

export function createUIMessageFixture(
  input: string[],
): UIMessage[];
export function createUIMessageFixture(
  ...input: string[]
): UIMessage[];
export function createUIMessageFixture(
  ...input: (string | string[])[]
): UIMessage[] {
  return input.flat().map((message, index) => {
    return {
      id: String(index + 1),
      role: index % 2 === 0 ? 'user' : 'assistant',
      parts: [{ type: 'text', text: message }],
    };
  });
}
