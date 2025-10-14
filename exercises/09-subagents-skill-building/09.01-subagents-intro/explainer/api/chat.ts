import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai';
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

export const POST = async (req: Request): Promise<Response> => {
  const body: {
    messages: MyMessage[];
    subagent: keyof typeof subagents;
  } = await req.json();
  const { messages, subagent } = body;

  console.log('Subagent:', subagent);

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const result = await subagents[subagent]({
        messages: convertToModelMessages(messages),
      });

      const textPartId = crypto.randomUUID();

      writer.write({
        type: 'text-start',
        id: textPartId,
      });

      writer.write({
        type: 'text-delta',
        id: textPartId,
        delta: result,
      });

      writer.write({
        type: 'text-end',
        id: textPartId,
      });
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
