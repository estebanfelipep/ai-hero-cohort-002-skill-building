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

type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  createdAt: string;
  updatedAt: string;
};

const eventsDb = createPersistenceLayer<{
  events: {
    [eventId: string]: CalendarEvent;
  };
}>({
  databasePath: join(process.cwd(), 'schedule.json'),
  defaultDatabase: {
    events: {},
  },
});

const formatCalendarEvents = (events: CalendarEvent[]) => {
  return events
    .map((event) =>
      [
        `## ${event.title}`,
        `ID: ${event.id}`,
        `Start: ${event.start}`,
        `End: ${event.end}`,
        `Created at: ${event.createdAt}`,
        `Updated at: ${event.updatedAt}`,
        `<description>`,
        event.description,
        `</description>`,
      ].join('\n'),
    )
    .join('\n\n');
};

export const schedulerAgent = async (opts: {
  messages: ModelMessage[];
}) => {
  const streamResult = streamText({
    model: google('gemini-2.0-flash'),
    system: `
      You are a helpful assistant that manages a calendar.

      The current date and time is ${new Date().toISOString()}.

      You have access to the following tools:

      - createEvents: Create one or more events in the calendar
      - updateEvent: Update an existing event in the calendar
      - deleteEvent: Delete an existing event in the calendar
      - listEvents: List events in the calendar between a specified range

      When you are asked to create an event, ensure that you check the day's events first to avoid conflicts.

      You will be given a prompt, and you will need to use the tools to manage the calendar.

      If you need to find an ID for a lesson to update or delete it, use the list events tool.
      This will return a list of events in the calendar, and you can use the ID of the event to update or delete it.
    `,
    messages: opts.messages,
    tools: {
      createEvents: tool({
        description: 'Create a new event in the calendar',
        inputSchema: z.object({
          events: z.array(
            z.object({
              title: z.string(),
              description: z.string().optional(),
              start: z
                .string()
                .describe(
                  'The start time of the event in ISO 8601 format',
                ),
              end: z
                .string()
                .describe(
                  'The end time of the event in ISO 8601 format',
                ),
            }),
          ),
        }),
        execute: async (input) => {
          const events = input.events.map((event) => ({
            id: crypto.randomUUID(),
            title: event.title,
            description: event.description,
            start: event.start,
            end: event.end,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          await eventsDb.updateDatabase((db) => {
            events.forEach((event) => {
              db.events[event.id] = event;
            });
          });

          return [
            `Events created successfully`,
            ...events.map(
              (event) => `- ${event.title} (${event.id})`,
            ),
          ].join('\n');
        },
      }),
      updateEvent: tool({
        description: 'Update an existing event in the calendar',
        inputSchema: z.object({
          id: z.string(),
          title: z
            .string()
            .optional()
            .describe(
              'The title of the event - only include if you want to change it',
            ),
          description: z
            .string()
            .optional()
            .describe(
              'The description of the event - only include if you want to change it',
            ),
          start: z
            .string()
            .optional()
            .describe(
              'The start time of the event - only include if you want to change it',
            ),
          end: z
            .string()
            .optional()
            .describe(
              'The end time of the event - only include if you want to change it',
            ),
        }),
        execute: async (input) => {
          const db = await eventsDb.loadDatabase();

          const event = db.events[input.id];

          if (!event) {
            return `Event with ID ${input.id} not found`;
          }

          await eventsDb.updateDatabase((db) => {
            db.events[input.id] = {
              ...event,
              ...input,
              updatedAt: new Date().toISOString(),
            };
          });

          return 'Event updated successfully';
        },
      }),
      deleteEvent: tool({
        description: 'Delete an existing event in the calendar',
        inputSchema: z.object({
          id: z.string(),
        }),
        execute: async (input) => {
          const db = await eventsDb.loadDatabase();

          if (!db.events[input.id]) {
            return `Event with ID ${input.id} not found`;
          }

          await eventsDb.updateDatabase((db) => {
            delete db.events[input.id];
          });

          return 'Event deleted successfully';
        },
      }),
      listEvents: tool({
        description:
          'List events in the calendar between a specified range',
        inputSchema: z.object({
          start: z
            .string()
            .optional()
            .describe(
              'The start time of the range in ISO 8601 format - if not provided, the start of the calendar will be used',
            ),
          end: z
            .string()
            .optional()
            .describe(
              'The end time of the range in ISO 8601 format - if not provided, the end of the calendar will be used',
            ),
        }),
        execute: async (input) => {
          console.log('listEvents', input);
          const db = await eventsDb.loadDatabase();
          const allEvents = Object.values(db.events);

          const rangeStart = input.start
            ? new Date(input.start).getTime()
            : 0;
          const rangeEnd = input.end
            ? new Date(input.end).getTime()
            : Infinity;

          const filteredEvents = allEvents.filter((event) => {
            const eventStart = new Date(event.start);

            return (
              eventStart.getTime() >= rangeStart &&
              eventStart.getTime() <= rangeEnd
            );
          });

          if (filteredEvents.length === 0) {
            return 'No events found in the specified range';
          }

          return formatCalendarEvents(filteredEvents);
        },
      }),
    },
    stopWhen: stepCountIs(10),
  });

  await streamResult.consumeStream();

  const finalMessages = (await streamResult.response).messages;

  return formatModelMessages(finalMessages);
};
