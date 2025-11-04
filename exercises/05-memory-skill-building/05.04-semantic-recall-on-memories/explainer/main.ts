import { runLocalDevServer } from '#shared/run-local-dev-server.ts';
import { embedMemory } from './api/embeddings.ts';
import {
  loadMemories,
  updateMemory,
} from './api/memory-persistence.ts';

const memories = loadMemories();

const memoriesWithoutEmbeddings = memories.filter(
  (memory) => !memory.embedding,
);

console.log(
  `Found ${memoriesWithoutEmbeddings.length} memories without embeddings - adding embeddings`,
);

for (const memory of memoriesWithoutEmbeddings) {
  memory.embedding = await embedMemory(memory.memory);
  updateMemory(memory.id, memory);
}

await runLocalDevServer({
  root: import.meta.dirname,
});
