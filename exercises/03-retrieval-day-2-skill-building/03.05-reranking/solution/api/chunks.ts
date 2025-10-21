import { createChunks } from './utils.ts';
import { searchChunks, type ChunkWithScores } from './search.ts';

export const GET = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(
    url.searchParams.get('pageSize') || '20',
    10,
  );
  const rerankCount = parseInt(
    url.searchParams.get('rerankCount') || '30',
    10,
  );

  let chunksWithScores: ChunkWithScores[] = [];

  if (search) {
    // Perform search and get sorted results with reranking
    // Results are already sorted by searchChunks (approved > rejected > not-passed)
    chunksWithScores = await searchChunks({
      keywordsForBM25: search.split(' ').map((s) => s.trim()),
      embeddingsQuery: search,
      rerankCount,
    });
  } else {
    // Return all chunks with zero scores
    const allChunks = await createChunks();
    chunksWithScores = allChunks.map((chunk) => ({
      chunk: chunk.content,
      bm25Score: 0,
      embeddingScore: 0,
      rrfScore: 0,
      rerankStatus: 'not-passed' as const,
    }));
  }

  // Calculate stats
  const totalChunks = chunksWithScores.length;
  const avgChars = Math.round(
    chunksWithScores.reduce(
      (sum, c) => sum + c.chunk.length,
      0,
    ) / totalChunks,
  );
  const pageCount = Math.ceil(totalChunks / pageSize);

  // Paginate
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedChunks = chunksWithScores.slice(
    startIndex,
    endIndex,
  );

  // Calculate score range for current page
  const pageScores = paginatedChunks.map((c) => c.rrfScore);
  const minScore =
    pageScores.length > 0 ? Math.min(...pageScores) : 0;
  const maxScore =
    pageScores.length > 0 ? Math.max(...pageScores) : 0;

  // Map to response format with indices
  const chunksWithIndices = paginatedChunks.map((item, idx) => ({
    index: startIndex + idx,
    content: item.chunk,
    bm25Score: item.bm25Score,
    embeddingScore: item.embeddingScore,
    rrfScore: item.rrfScore,
    rerankStatus: item.rerankStatus,
  }));

  return Response.json({
    chunks: chunksWithIndices,
    stats: {
      total: totalChunks,
      avgChars,
      pageCount,
      currentPage: page,
      minScore,
      maxScore,
    },
  });
};
