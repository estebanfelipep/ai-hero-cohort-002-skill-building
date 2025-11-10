# Evaluating Memory Extraction

## Learning Goals

Test memory extraction from conversation history using Evalite. Binary scoring (was memory created when expected?). Length scoring (avoid overly long memories). Manual test case creation (5 scenarios). Foundation for 06.02 synthetic dataset generation.

## Steps To Complete

### 1. Setup Evalite Structure

Create test file importing `extractMemories()` from project repo.

**Implementation (`main.ts`):**

```ts
import { evalite } from 'evalite';
import { extractMemories } from '../../../ai-personal-assistant/src/lib/extract-memories';
import { DB } from '../../../ai-personal-assistant/src/lib/persistence-layer';

type TestCase = {
  name: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  existingMemories: DB.Memory[];
  expectedMemoryCreated: boolean; // Should any memory be created?
};

const testCases: TestCase[] = [
  // Will define in step 2
];

evalite('Memory Extraction', {
  data: testCases,
  task: async (input) => {
    const result = await extractMemories({
      messages: input.messages,
      existingMemories: input.existingMemories,
    });
    return result;
  },
  scorers: [
    // Will define in step 3
  ],
});
```

**Notes:**

- Import `extractMemories()` from project repo (refactored in 04.03)
- Test cases include conversation + expected outcome
- Task calls extraction function, returns operations

### 2. Create 5 Manual Test Cases

Define conversation scenarios covering key behaviors.

**Implementation:**

```ts
const testCases: TestCase[] = [
  {
    name: 'Casual chat - no memory',
    messages: [
      { role: 'user', content: 'Hi, how are you?' },
      {
        role: 'assistant',
        content: "I'm doing well! How can I help you today?",
      },
      { role: 'user', content: "What's the weather like?" },
      {
        role: 'assistant',
        content:
          "I don't have access to real-time weather data.",
      },
    ],
    existingMemories: [],
    expectedMemoryCreated: false,
  },
  {
    name: 'Personal info - create memory',
    messages: [
      { role: 'user', content: 'My favorite drink is coffee' },
      {
        role: 'assistant',
        content: 'Great to know you enjoy coffee!',
      },
    ],
    existingMemories: [],
    expectedMemoryCreated: true,
  },
  {
    name: 'Contradiction - update memory',
    messages: [
      {
        role: 'user',
        content: 'Actually, I prefer tea over coffee',
      },
      {
        role: 'assistant',
        content:
          "Thanks for letting me know, I'll remember that.",
      },
    ],
    existingMemories: [
      {
        id: 'mem-1',
        title: 'Favorite Drink',
        content: 'User prefers coffee',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
    expectedMemoryCreated: true, // Update counts as "creating" an operation
  },
  {
    name: 'Mixed permanent and situational',
    messages: [
      {
        role: 'user',
        content:
          'I work as a software engineer. The weather is nice today.',
      },
      {
        role: 'assistant',
        content:
          'Interesting! Software engineering is a great field.',
      },
    ],
    existingMemories: [],
    expectedMemoryCreated: true, // Should extract occupation, skip weather
  },
  {
    name: 'Edge case - multiple facts',
    messages: [
      {
        role: 'user',
        content:
          'I have a dog named Max, I live in Seattle, and I love hiking',
      },
      {
        role: 'assistant',
        content:
          "That's wonderful! Seattle has great hiking trails.",
      },
    ],
    existingMemories: [],
    expectedMemoryCreated: true, // Should batch into memories
  },
];
```

**Notes:**

- Cover spectrum: no memory, create, update, mixed, multiple facts
- Keep conversations short (2-4 turns)
- `expectedMemoryCreated` checks if ANY operation happened
- Section 06.02 will generate larger dataset synthetically

### 3. Add Binary Scorer

Check if memory created when expected.

**Implementation:**

```ts
scorers: [
  (input, output) => {
    const memoryCreated =
      output.additions.length > 0 ||
      output.updates.length > 0 ||
      output.deletions.length > 0;

    const correct =
      memoryCreated === input.expectedMemoryCreated;

    return {
      name: 'Memory Created Correctly',
      score: correct ? 1 : 0,
    };
  },
];
```

**Notes:**

- Binary scoring: 1 for correct, 0 for incorrect
- Checks if any operation happened (additions/updates/deletions)
- Validates against expected behavior

### 4. Add Length Scorer

Verify memory content not excessively long.

**Implementation:**

```ts
scorers: [
  // ... existing scorer ...
  (input, output) => {
    const MAX_CONTENT_LENGTH = 500;

    const allAdditions = output.additions.map((a) => a.content);
    const allUpdates = output.updates.map((u) => u.content);
    const allContents = [...allAdditions, ...allUpdates];

    const tooLong = allContents.some(
      (content) => content.length > MAX_CONTENT_LENGTH,
    );

    return {
      name: 'Memory Length Reasonable',
      score: tooLong ? 0 : 1,
    };
  },
];
```

**Notes:**

- Threshold: 500 chars (adjust based on needs)
- Checks all additions and updates
- Score 0 if any memory too long
- Prevents overly verbose memory extraction

### 5. Run Evaluation and Analyze Results

Execute tests, review scores.

**Running:**

```bash
pnpm evalite main.ts
```

**Expected output:**

```
Memory Extraction

✓ Casual chat - no memory
  Memory Created Correctly: 1
  Memory Length Reasonable: 1

✓ Personal info - create memory
  Memory Created Correctly: 1
  Memory Length Reasonable: 1

...
```

**Notes:**

- Review failures - adjust prompts or test cases
- Length scorer identifies overly detailed memories
- Binary scorer catches over/under-extraction
- Foundation for scaling to larger datasets (06.02)

## Additional Notes

**Why This Matters:**

- Validates `extractMemories()` function works correctly
- Catches regressions when changing prompts/models
- Quantifies accuracy before production
- Foundation for synthetic dataset testing (06.02)

**Test Case Design:**

- Manual cases (5) vs synthetic (06.02 will generate many)
- Cover happy path, edge cases, contradictions
- Keep simple for debugging
- Expand after validating basic behavior

**Scorer Strategy:**

- Binary: catches major failures (over/under-extraction)
- Length: prevents bloat, token waste
- Two scorers provide complementary perspectives

**Next Steps:**

- 06.02: Create synthetic dataset generator (12+ test cases)
- 06.03: Evaluate retrieval algorithms
- Scale testing with generated data
