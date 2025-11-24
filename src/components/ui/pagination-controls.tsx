/**
 * Pagination Controls Component
 *
 * Simple, reusable pagination UI for tables and lists.
 */

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationControlsProps {
  /** Current page (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalCount?: number;
  /** Items per page */
  pageSize?: number;
  /** Whether there is a previous page */
  hasPrevious: boolean;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Go to first page */
  onFirstPage?: () => void;
  /** Go to last page */
  onLastPage?: () => void;
  /** Show page info (default: true) */
  showPageInfo?: boolean;
}

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  pageSize,
  hasPrevious,
  hasNext,
  onPageChange,
  onFirstPage,
  onLastPage,
  showPageInfo = true,
}: PaginationControlsProps) {
  const handleFirstPage = () => {
    if (onFirstPage) {
      onFirstPage();
    } else {
      onPageChange(1);
    }
  };

  const handleLastPage = () => {
    if (onLastPage) {
      onLastPage();
    } else {
      onPageChange(totalPages);
    }
  };

  const handlePrevious = () => {
    if (hasPrevious) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onPageChange(page + 1);
    }
  };

  // Calculate item range
  const startItem = totalCount ? (page - 1) * (pageSize || 0) + 1 : 0;
  const endItem = totalCount
    ? Math.min(page * (pageSize || 0), totalCount)
    : 0;

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {showPageInfo && (
        <div className="text-sm text-muted-foreground">
          {totalCount !== undefined && pageSize !== undefined ? (
            <>
              Showing {startItem.toLocaleString()} to {endItem.toLocaleString()} of{' '}
              {totalCount.toLocaleString()} results
            </>
          ) : (
            <>
              Page {page} of {totalPages}
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFirstPage}
          disabled={!hasPrevious}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={!hasPrevious}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2 px-2">
          <span className="text-sm font-medium">
            Page {page} of {totalPages}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!hasNext}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLastPage}
          disabled={!hasNext}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
