import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ChunkCard,
  Pagination,
  SearchForm,
  StatsBar,
  Wrapper,
} from './components.tsx';
import './tailwind.css';

type RerankStatus = 'approved' | 'rejected' | 'not-passed';

type ChunksResponse = {
  chunks: Array<{
    index: number;
    content: string;
    bm25Score: number;
    embeddingScore: number;
    rrfScore: number;
    rerankStatus: RerankStatus;
  }>;
  stats: {
    total: number;
    avgChars: number;
    pageCount: number;
    currentPage: number;
    minScore: number;
    maxScore: number;
  };
};

const ChunkViewer = () => {
  const [keywords, setKeywords] = useState('TypeScript start beginning');
  const [semantic, setSemantic] = useState('How did TypeScript start?');
  const [page, setPage] = useState(1);
  const [rerankCount, setRerankCount] = useState(30);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['chunks', keywords, semantic, page, rerankCount],
    queryFn: async () => {
      const params = new URLSearchParams({
        keywords,
        semantic,
        page: page.toString(),
        rerankCount: rerankCount.toString(),
      });
      const res = await fetch(`/api/chunks?${params}`);
      return (await res.json()) as ChunksResponse;
    },
  });

  const handleSearchSubmit = (
    keywordsValue: string,
    semanticValue: string,
    rerankValue: number,
  ) => {
    setKeywords(keywordsValue);
    setSemantic(semanticValue);
    setRerankCount(rerankValue);
    setPage(1);
    refetch();
  };

  return (
    <Wrapper
      header={
        <>
          <SearchForm
            keywordsValue={keywords}
            semanticValue={semantic}
            rerankValue={rerankCount}
            onSubmit={handleSearchSubmit}
          />
          {isLoading ? (
            <div className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
              <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                  Loading...
                </span>
              </div>
            </div>
          ) : data ? (
            <StatsBar
              total={data.stats.total}
              avgChars={data.stats.avgChars}
              currentPage={data.stats.currentPage}
              pageCount={data.stats.pageCount}
              minScore={data.stats.minScore * 10}
              maxScore={data.stats.maxScore * 10}
            />
          ) : null}
        </>
      }
      footer={
        isLoading || !data ? null : (
          <Pagination
            currentPage={page}
            pageCount={data.stats.pageCount}
            onPageChange={setPage}
          />
        )
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading chunks...
        </div>
      ) : data ? (
        data.chunks.map((chunk) => (
          <ChunkCard
            key={chunk.index}
            index={chunk.index}
            content={chunk.content}
            bm25Score={chunk.bm25Score}
            embeddingScore={chunk.embeddingScore}
            rrfScore={chunk.rrfScore}
            rerankStatus={chunk.rerankStatus}
          />
        ))
      ) : null}
    </Wrapper>
  );
};

const App = () => {
  return <ChunkViewer />;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <QueryClientProvider client={new QueryClient()}>
    <App />
  </QueryClientProvider>,
);
