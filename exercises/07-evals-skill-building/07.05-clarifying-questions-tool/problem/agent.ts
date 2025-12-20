import {
  convertToModelMessages,
  streamText,
  tool,
  type UIMessage,
  type StopCondition,
  type LanguageModel,
} from 'ai';
import { z } from 'zod';

const tools = {
  askForClarification: tool({
    description:
      'This tool is used to ask the user clarifying questions when their request is missing critical information needed to complete the task. Provide pre-filled answer options for each question when possible.',
    inputSchema: z.object({
      questions: z
        .array(
          z.object({
            question: z
              .string()
              .describe('The question to ask the user'),
            field: z
              .string()
              .describe('The field name this question is about'),
            options: z
              .array(z.string())
              .describe(
                'Pre-filled answer choices for the user to select from',
              ),
          }),
        )
        .describe('Array of clarifying questions to ask'),
    }),
    execute: async ({ questions }) => {
      return 'askForClarification tool called';
    },
  }),

  createSpreadsheet: tool({
    description:
      'Create new spreadsheet with columns and initial data',
    inputSchema: z.object({
      name: z.string().describe('Name of spreadsheet'),
      columns: z.array(z.string()).describe('Column headers'),
      initialRows: z
        .number()
        .optional()
        .describe('Number of empty rows'),
    }),
    execute: async () => 'Spreadsheet created successfully',
  }),

  searchCalendarEvents: tool({
    description:
      'Search calendar for events with title, date, or location. If the user asks to cancel, update, or create an event, search for the event first.',
    inputSchema: z.object({
      title: z.string().optional(),
      date: z.string().optional(),
      location: z.string().optional(),
    }),
    execute: async () => 'Calendar events searched successfully',
  }),

  updateCalendarEvent: tool({
    description:
      'Update existing calendar event time, location, or attendees',
    inputSchema: z.object({
      eventId: z.string().describe('Calendar event ID'),
      title: z.string().optional(),
      startTime: z.string().optional().describe('ISO datetime'),
      endTime: z.string().optional().describe('ISO datetime'),
      location: z.string().optional(),
    }),
    execute: async () => 'Calendar event updated successfully',
  }),

  searchWeb: tool({
    description:
      'Search web for current information and return top results',
    inputSchema: z.object({
      query: z.string().describe('Search query'),
      maxResults: z
        .number()
        .default(10)
        .describe('Max results to return'),
      dateRange: z
        .enum(['day', 'week', 'month', 'year', 'all'])
        .optional(),
    }),
    execute: async () => 'Web search completed successfully',
  }),

  sendEmail: tool({
    description:
      'Send email to recipients with subject and body',
    inputSchema: z.object({
      to: z
        .array(z.string().email())
        .describe('Recipient email addresses'),
      subject: z.string(),
      body: z.string().describe('Email body content'),
      cc: z.array(z.string().email()).optional(),
      attachments: z
        .array(z.string())
        .optional()
        .describe('File paths'),
    }),
    execute: async () => 'Email sent successfully',
  }),

  translateText: tool({
    description:
      'Translate text between languages with language detection',
    inputSchema: z.object({
      text: z.string().describe('Text to translate'),
      targetLanguage: z
        .string()
        .describe('Target language code (e.g., es, fr, de)'),
      sourceLanguage: z
        .string()
        .optional()
        .describe('Source language, auto-detect if omitted'),
    }),
    execute: async () => 'Translation completed successfully',
  }),

  createTask: tool({
    description:
      'Create task in todo list with priority and due date',
    inputSchema: z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z
        .enum(['low', 'medium', 'high', 'urgent'])
        .default('medium'),
      dueDate: z.string().optional().describe('ISO date'),
      tags: z.array(z.string()).optional(),
    }),
    execute: async () => 'Task created successfully',
  }),

  analyzeImage: tool({
    description:
      'Analyze image to detect objects, text, or describe contents',
    inputSchema: z.object({
      imageUrl: z.string().url().describe('Image URL'),
      analysisType: z.enum([
        'objects',
        'text',
        'description',
        'faces',
      ]),
      detailLevel: z
        .enum(['low', 'medium', 'high'])
        .default('medium'),
    }),
    execute: async () => 'Image analysis completed successfully',
  }),

  bookFlight: tool({
    description:
      'Search and book flights between cities with preferences',
    inputSchema: z.object({
      from: z
        .string()
        .describe('Departure city or airport code'),
      to: z
        .string()
        .describe('Destination city or airport code'),
      departDate: z
        .string()
        .describe('Departure date (YYYY-MM-DD)'),
      returnDate: z
        .string()
        .optional()
        .describe('Return date for round trip'),
      passengers: z.number().default(1),
      class: z
        .enum(['economy', 'premium', 'business', 'first'])
        .default('economy'),
    }),
    execute: async () => 'Flight booking completed successfully',
  }),

  generateQRCode: tool({
    description:
      'Generate QR code for URL, text, or contact information',
    inputSchema: z.object({
      content: z.string().describe('Content to encode'),
      size: z.number().default(256).describe('Size in pixels'),
      format: z.enum(['png', 'svg', 'jpg']).default('png'),
      errorCorrection: z.enum(['L', 'M', 'Q', 'H']).default('M'),
    }),
    execute: async () => 'QR code generated successfully',
  }),

  setReminder: tool({
    description:
      'Set reminder notification for specific date and time',
    inputSchema: z.object({
      message: z.string().describe('Reminder message'),
      dateTime: z.string().describe('ISO datetime for reminder'),
      recurring: z
        .enum(['none', 'daily', 'weekly', 'monthly'])
        .default('none'),
      priority: z
        .enum(['low', 'medium', 'high'])
        .default('medium'),
    }),
    execute: async () => 'Reminder set successfully',
  }),

  convertCurrency: tool({
    description:
      'Convert amount between currencies using current exchange rates',
    inputSchema: z.object({
      amount: z.number().describe('Amount to convert'),
      fromCurrency: z
        .string()
        .describe('Source currency code (e.g., USD, EUR)'),
      toCurrency: z.string().describe('Target currency code'),
      date: z
        .string()
        .optional()
        .describe('Historical date for rates'),
    }),
    execute: async () =>
      'Currency conversion completed successfully',
  }),

  transcribeAudio: tool({
    description:
      'Transcribe audio file to text with speaker detection',
    inputSchema: z.object({
      audioUrl: z.string().url().describe('Audio file URL'),
      language: z
        .string()
        .optional()
        .describe('Language code, auto-detect if omitted'),
      detectSpeakers: z.boolean().default(false),
      timestamped: z.boolean().default(false),
    }),
    execute: async () =>
      'Audio transcription completed successfully',
  }),

  createInvoice: tool({
    description:
      'Generate invoice for client with line items and payment terms',
    inputSchema: z.object({
      clientName: z.string(),
      clientEmail: z.string().email(),
      items: z.array(
        z.object({
          description: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
        }),
      ),
      dueDate: z.string().describe('Payment due date'),
      currency: z.string().default('USD'),
    }),
    execute: async () => 'Invoice created successfully',
  }),

  checkWeather: tool({
    description: 'Get current weather and forecast for location',
    inputSchema: z.object({
      location: z.string().describe('City name or coordinates'),
      days: z
        .number()
        .default(1)
        .describe('Forecast days (1-14)'),
      units: z.enum(['metric', 'imperial']).default('metric'),
      includeHourly: z.boolean().default(false),
    }),
    execute: async () => 'Weather data retrieved successfully',
  }),

  compressFile: tool({
    description:
      'Compress file or folder to archive with format and level options',
    inputSchema: z.object({
      sourcePath: z.string().describe('File or folder path'),
      outputPath: z.string().describe('Output archive path'),
      format: z.enum(['zip', 'tar', 'gz', '7z']).default('zip'),
      compressionLevel: z.number().min(0).max(9).default(6),
    }),
    execute: async () =>
      'File compression completed successfully',
  }),

  schedulePost: tool({
    description:
      'Schedule social media post to multiple platforms',
    inputSchema: z.object({
      content: z.string().describe('Post content'),
      platforms: z.array(
        z.enum(['twitter', 'linkedin', 'facebook', 'instagram']),
      ),
      scheduledTime: z.string().describe('ISO datetime'),
      mediaUrls: z.array(z.string().url()).optional(),
      hashtags: z.array(z.string()).optional(),
    }),
    execute: async () => 'Post scheduled successfully',
  }),

  analyzeDocument: tool({
    description:
      'Extract and analyze text, tables, and metadata from documents',
    inputSchema: z.object({
      documentUrl: z
        .string()
        .url()
        .describe('Document URL (PDF, DOCX, etc)'),
      extractTables: z.boolean().default(true),
      extractImages: z.boolean().default(false),
      summarize: z.boolean().default(false),
    }),
    execute: async () =>
      'Document analysis completed successfully',
  }),

  createBackup: tool({
    description:
      'Create backup of specified files or databases to storage',
    inputSchema: z.object({
      sources: z.array(z.string()).describe('Paths to backup'),
      destination: z
        .string()
        .describe('Backup destination path or URL'),
      incremental: z.boolean().default(false),
      encrypt: z.boolean().default(true),
      retention: z
        .number()
        .optional()
        .describe('Days to keep backups'),
    }),
    execute: async () => 'Backup created successfully',
  }),

  generateReport: tool({
    description:
      'Generate analytical report from data with charts and insights',
    inputSchema: z.object({
      dataSource: z
        .string()
        .describe('Data source identifier or URL'),
      reportType: z.enum([
        'sales',
        'financial',
        'performance',
        'custom',
      ]),
      dateRange: z.object({
        start: z.string(),
        end: z.string(),
      }),
      format: z.enum(['pdf', 'excel', 'html']).default('pdf'),
      includeCharts: z.boolean().default(true),
    }),
    execute: async () => 'Report generated successfully',
  }),

  moderateContent: tool({
    description:
      'Moderate user-generated content for policy violations',
    inputSchema: z.object({
      content: z.string().describe('Content to moderate'),
      contentType: z.enum(['text', 'image', 'video']),
      strictness: z
        .enum(['low', 'medium', 'high'])
        .default('medium'),
      categories: z
        .array(z.enum(['violence', 'hate', 'adult', 'spam']))
        .optional(),
    }),
    execute: async () =>
      'Content moderation completed successfully',
  }),
};

export const runAgent = (
  model: LanguageModel,
  messages: UIMessage[],
  stopWhen: StopCondition<any>,
) => {
  const result = streamText({
    model,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen,
    system: `Today's date is ${new Date().toISOString().split('T')[0]}.

When the user makes a request that is missing critical information needed to complete the task, use the askForClarification tool to ask for the missing information. Provide pre-filled answer options when possible to make it easier for the user to respond.

Examples of when to use the askForClarification tool:

1. "Book a flight to Paris"
{
  "questions": [
    {
      "question": "Where are you departing from?",
      "field": "from",
      "options": ["New York", "London", "Los Angeles", "San Francisco", "Chicago"]
    },
    {
      "question": "When would you like to depart?",
      "field": "departDate",
      "options": ["Today", "Tomorrow", "This weekend", "Next week"]
    },
    {
      "question": "How many passengers?",
      "field": "passengers",
      "options": ["1", "2", "3", "4+"]
    }
  ]
}

2. "Send an email to John"
{
  "questions": [
    {
      "question": "What is John's email address?",
      "field": "to",
      "options": ["john@company.com", "john.smith@company.com", "john.doe@company.com"]
    },
    {
      "question": "What should the subject line be?",
      "field": "subject",
      "options": ["Follow-up", "Meeting request", "Quick question"]
    },
    {
      "question": "What would you like to say in the email?",
      "field": "body",
      "options": ["I'll write my own message"]
    }
  ]
}

3. "Create an invoice"
{
  "questions": [
    {
      "question": "What is the client's name?",
      "field": "clientName",
      "options": ["Acme Corp", "Tech Startup Inc", "Global Services LLC"]
    },
    {
      "question": "What is the client's email address?",
      "field": "clientEmail",
      "options": ["billing@client.com", "accounts@client.com"]
    },
    {
      "question": "What items or services are you invoicing for?",
      "field": "items",
      "options": ["Consulting services", "Software development", "Design work", "Custom items"]
    },
    {
      "question": "When is payment due?",
      "field": "dueDate",
      "options": ["Net 15", "Net 30", "Net 60", "Due on receipt"]
    }
  ]
}

Do NOT ask for clarification if the request already contains all the necessary information to complete the task.

ONLY ask for clarification using the askForClarification tool.

`,
  });

  return result;
};
