import React from 'react';
import { Type, Brain, Zap } from 'lucide-react';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export const Wrapper = (props: {
  header: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {props.header}
      <div className="flex-1 overflow-y-auto py-8 pt-6 scrollbar-thin scrollbar-track-background scrollbar-thumb-muted hover:scrollbar-thumb-muted-foreground">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 xl:grid-cols-3 gap-4 px-4">
          {props.children}
        </div>
      </div>

      {props.footer}
    </div>
  );
};

export const StatsBar = ({
  total,
  avgChars,
  currentPage,
  pageCount,
  minScore,
  maxScore,
}: {
  total: number;
  avgChars: number;
  currentPage: number;
  pageCount: number;
  minScore: number;
  maxScore: number;
}) => {
  return (
    <div className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">
              {total}
            </span>{' '}
            chunks
          </span>
          <span className="text-border">|</span>
          <span>
            Avg{' '}
            <span className="font-medium text-foreground">
              {avgChars}
            </span>{' '}
            chars
          </span>
          <span className="text-border">|</span>
          <span>
            Page{' '}
            <span className="font-medium text-foreground">
              {currentPage}
            </span>
            /{pageCount}
          </span>
          {maxScore > 0 && (
            <>
              <span className="text-border">|</span>
              <span>
                Score range{' '}
                <span className="font-medium text-foreground">
                  {(maxScore * 10).toFixed(1)}
                </span>
                {' - '}
                <span className="font-medium text-foreground">
                  {(minScore * 10).toFixed(1)}
                </span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChunkCard = ({
  index,
  content,
  bm25Score,
  embeddingScore,
  rrfScore,
  activeOrder,
}: {
  index: number;
  content: string;
  bm25Score: number;
  embeddingScore: number;
  rrfScore: number;
  activeOrder?: 'rrf' | 'semantic' | 'bm25';
}) => {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Chunk #{index + 1}
        </span>
        {rrfScore > 0 && (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs font-mono flex items-center transition-all',
                activeOrder === 'bm25'
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground',
              )}
              title="BM25 Score"
            >
              <Type
                className={cn(
                  'w-3 h-3 mr-1.5 transition-all',
                  activeOrder === 'bm25'
                    ? 'text-blue-400'
                    : 'text-blue-500',
                )}
              />
              {bm25Score.toFixed(1)}
            </span>
            <span
              className={cn(
                'text-xs font-mono flex items-center transition-all',
                activeOrder === 'semantic'
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground',
              )}
              title="Semantic Score"
            >
              <Brain
                className={cn(
                  'w-3 h-3 mr-1.5 transition-all',
                  activeOrder === 'semantic'
                    ? 'text-pink-400'
                    : 'text-pink-500',
                )}
              />
              {(embeddingScore * 100).toFixed(1)}%
            </span>
            <span
              className={cn(
                'text-xs font-mono flex items-center transition-all',
                activeOrder === 'rrf'
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground',
              )}
              title="Final RRF Score"
            >
              <Zap
                className={cn(
                  'w-3 h-3 mr-1.5 transition-all',
                  activeOrder === 'rrf'
                    ? 'text-yellow-400'
                    : 'text-yellow-500',
                )}
              />
              {(rrfScore * 100).toFixed(1)}
            </span>
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-foreground/90 whitespace-pre-wrap font-mono font-extralight">
          {content.trim()}
        </p>
      </div>
    </div>
  );
};

export const SearchInput = ({
  keywordsValue,
  semanticValue,
  onKeywordsChange,
  onSemanticChange,
  onSubmit,
}: {
  keywordsValue: string;
  semanticValue: string;
  onKeywordsChange: (value: string) => void;
  onSemanticChange: (value: string) => void;
  onSubmit: (keywords: string, semantic: string) => void;
}) => {
  return (
    <div className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto py-3 px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(keywordsValue, semanticValue);
          }}
          className="flex flex-col gap-3 max-w-3xl"
        >
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Brain className="w-3 h-3 text-pink-400" />
                Semantic search query
              </label>
              <input
                type="text"
                placeholder="Enter semantic search query..."
                value={semanticValue}
                onChange={(e) => onSemanticChange(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm transition-all',
                  'placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
                  'hover:border-ring/50',
                )}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Type className="w-3 h-3 text-blue-400" />
                Keywords (BM25)
              </label>
              <input
                type="text"
                placeholder="Enter keywords separated by spaces..."
                value={keywordsValue}
                onChange={(e) => onKeywordsChange(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm transition-all',
                  'placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
                  'hover:border-ring/50',
                )}
              />
            </div>
          </div>
          <button
            type="submit"
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg border border-border transition-all self-start',
              'bg-card text-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            Search
          </button>
        </form>
      </div>
    </div>
  );
};

export const Pagination = ({
  currentPage,
  pageCount,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) => {
  return (
    <div className="flex-shrink-0 border-t border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg border border-border transition-all',
            currentPage === 1
              ? 'opacity-50 cursor-not-allowed bg-card text-muted-foreground'
              : 'bg-card text-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === pageCount}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg border border-border transition-all',
            currentPage === pageCount
              ? 'opacity-50 cursor-not-allowed bg-card text-muted-foreground'
              : 'bg-card text-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export const OrderSelector = ({
  value,
  onChange,
}: {
  value: 'rrf' | 'semantic' | 'bm25';
  onChange: (value: 'rrf' | 'semantic' | 'bm25') => void;
}) => {
  return (
    <div className="flex-shrink-0 bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 pb-1 flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-2">
          Order by:
        </span>
        <button
          onClick={() => onChange('bm25')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md border transition-all flex items-center gap-1.5',
            value === 'bm25'
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
              : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <Type className="w-3 h-3" />
          BM25
        </button>
        <button
          onClick={() => onChange('semantic')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md border transition-all flex items-center gap-1.5',
            value === 'semantic'
              ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
              : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <Brain className="w-3 h-3" />
          Semantic
        </button>
        <button
          onClick={() => onChange('rrf')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md border transition-all flex items-center gap-1.5',
            value === 'rrf'
              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
              : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <Zap className="w-3 h-3" />
          RRF
        </button>
      </div>
    </div>
  );
};
