import React from 'react';
import {
  Type,
  Brain,
  Zap,
  CheckCircle,
  XCircle,
  MinusCircle,
} from 'lucide-react';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

type RerankStatus = 'approved' | 'rejected' | 'not-passed';

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
  rerankStatus,
}: {
  index: number;
  content: string;
  bm25Score: number;
  embeddingScore: number;
  rrfScore: number;
  rerankStatus: RerankStatus;
}) => {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Chunk #{index + 1}
          </span>
          {rerankStatus !== 'not-passed' && (
            <RerankStatusBadge status={rerankStatus} />
          )}
        </div>
        {rrfScore > 0 && (
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono flex items-center text-muted-foreground"
              title="BM25 Score"
            >
              <Type className="w-3 h-3 mr-1.5 text-blue-500" />
              {bm25Score.toFixed(1)}
            </span>
            <span
              className="text-xs font-mono flex items-center text-muted-foreground"
              title="Semantic Score"
            >
              <Brain className="w-3 h-3 mr-1.5 text-pink-500" />
              {(embeddingScore * 100).toFixed(1)}%
            </span>
            <span
              className="text-xs font-mono flex items-center text-muted-foreground"
              title="RRF Score"
            >
              <Zap className="w-3 h-3 mr-1.5 text-yellow-500" />
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

const RerankStatusBadge = ({
  status,
}: {
  status: RerankStatus;
}) => {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
        <CheckCircle className="w-3 h-3" />
        Approved
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
        <XCircle className="w-3 h-3" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted/20 text-muted-foreground border border-border">
      <MinusCircle className="w-3 h-3" />
      Not Passed
    </span>
  );
};

export const SearchForm = ({
  searchValue,
  rerankValue,
  onSubmit,
}: {
  searchValue: string;
  rerankValue: number;
  onSubmit: (searchValue: string, rerankValue: number) => void;
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const search = formData.get('search') as string;
    const rerank = formData.get('rerank') as string;
    onSubmit(search, parseInt(rerank, 10) || 0);
  };

  return (
    <div className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto py-3 px-4">
        <form
          onSubmit={handleSubmit}
          id="search-form"
          className="flex items-center gap-4"
        >
          <input
            type="text"
            placeholder="Search chunks... (press Enter)"
            defaultValue={searchValue}
            name="search"
            className={cn(
              'flex-1 rounded-lg border border-input bg-card px-4 py-2.5 text-sm shadow-sm transition-all max-w-lg',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
              'hover:border-ring/50',
            )}
          />
          <input type="submit" value="Search" hidden />
          <div className="flex items-center gap-3">
            <label
              htmlFor="rerank-count"
              className="text-xs text-muted-foreground whitespace-nowrap"
            >
              Rerank top:
            </label>
            <input
              id="rerank-count"
              type="number"
              min="0"
              max="100"
              defaultValue={rerankValue}
              name="rerank"
              className={cn(
                'w-20 rounded-md border border-input bg-card px-3 py-1.5 text-xs shadow-sm transition-all',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
                'hover:border-ring/50',
              )}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              chunks
            </span>
          </div>
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
