import { searchViaBM25 } from './bm25.ts';
import { searchChunksViaEmbeddings } from './embeddings.ts';
import { createChunks, reciprocalRankFusion } from './utils.ts';

export type ChunkWithScores = {
  chunk: string;
  bm25Score: number;
  embeddingScore: number;
  rrfScore: number;
};

export const searchChunks = async (opts: {
  keywordsForBM25?: string[];
  embeddingsQuery?: string;
}): Promise<ChunkWithScores[]> => {
  const chunks = await createChunks();
  const chunkTexts = chunks.map((c) => c.content);

  const bm25SearchResults =
    opts.keywordsForBM25 && opts.keywordsForBM25.length > 0
      ? await searchViaBM25(chunkTexts, opts.keywordsForBM25)
      : [];

  const embeddingsSearchResults =
    opts.embeddingsQuery
      ? await searchChunksViaEmbeddings(
          chunks,
          opts.embeddingsQuery,
        )
      : [];

  const rrfResults = reciprocalRankFusion([
    embeddingsSearchResults,
    bm25SearchResults,
  ]);

  // Create maps for quick lookup of individual scores
  const bm25Map = new Map(
    bm25SearchResults.map((r) => [r.chunk, r.score]),
  );
  const embeddingMap = new Map(
    embeddingsSearchResults.map((r) => [r.chunk, r.score]),
  );

  // Combine all scores for each chunk
  return rrfResults.map((result) => ({
    chunk: result.chunk,
    bm25Score: bm25Map.get(result.chunk) || 0,
    embeddingScore: embeddingMap.get(result.chunk) || 0,
    rrfScore: result.score,
  }));
};
