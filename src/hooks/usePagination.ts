/**
 * usePagination Hook
 *
 * Reusable pagination logic with Supabase support.
 * Handles page state, range calculations, and count queries.
 *
 * Usage:
 * ```tsx
 * const pagination = usePagination({
 *   pageSize: 50,
 *   onPageChange: (page) => console.log('Page changed:', page)
 * });
 *
 * // In query:
 * .range(pagination.from, pagination.to)
 *
 * // Update total count:
 * pagination.setTotalCount(count);
 *
 * // Pagination UI:
 * <Pagination {...pagination.paginationProps} />
 * ```
 */

import { useState, useCallback, useMemo } from 'react';

export interface UsePaginationOptions {
  /** Items per page (default: 50) */
  pageSize?: number;
  /** Initial page (default: 1) */
  initialPage?: number;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
}

export interface UsePaginationReturn {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  totalCount: number;
  /** Total number of pages */
  totalPages: number;
  /** Start index for range query (0-indexed) */
  from: number;
  /** End index for range query (inclusive, 0-indexed) */
  to: number;
  /** Whether there is a previous page */
  hasPrevious: boolean;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  previousPage: () => void;
  /** Go to first page */
  firstPage: () => void;
  /** Go to last page */
  lastPage: () => void;
  /** Update total count (call after query) */
  setTotalCount: (count: number) => void;
  /** Props for Pagination component */
  paginationProps: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const {
    pageSize = 50,
    initialPage = 1,
    onPageChange,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);

  // Calculate range for Supabase query
  const from = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const to = useMemo(() => from + pageSize - 1, [from, pageSize]);

  // Calculate total pages
  const totalPages = useMemo(
    () => Math.ceil(totalCount / pageSize),
    [totalCount, pageSize]
  );

  // Navigation state
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  // Page navigation functions
  const goToPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, Math.min(newPage, totalPages || 1));
      setPage(validPage);
      onPageChange?.(validPage);
    },
    [totalPages, onPageChange]
  );

  const nextPage = useCallback(() => {
    if (hasNext) {
      goToPage(page + 1);
    }
  }, [hasNext, page, goToPage]);

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      goToPage(page - 1);
    }
  }, [hasPrevious, page, goToPage]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    if (totalPages > 0) {
      goToPage(totalPages);
    }
  }, [totalPages, goToPage]);

  // Props for Pagination component
  const paginationProps = useMemo(
    () => ({
      page,
      totalPages,
      onPageChange: goToPage,
      hasNext,
      hasPrevious,
    }),
    [page, totalPages, goToPage, hasNext, hasPrevious]
  );

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    from,
    to,
    hasPrevious,
    hasNext,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setTotalCount,
    paginationProps,
  };
}

/**
 * Get total count from Supabase query
 *
 * Usage:
 * ```tsx
 * const { data, count } = await supabase
 *   .from('table')
 *   .select('*', { count: 'exact' })
 *   .range(from, to);
 * ```
 */
export function usePaginatedQuery<T>(
  queryFn: (from: number, to: number) => Promise<{ data: T[] | null; count: number | null; error: any }>,
  options: UsePaginationOptions = {}
) {
  const pagination = usePagination(options);

  const query = useCallback(async () => {
    const result = await queryFn(pagination.from, pagination.to);

    if (result.count !== null) {
      pagination.setTotalCount(result.count);
    }

    return result;
  }, [pagination.from, pagination.to, queryFn]);

  return {
    pagination,
    query,
  };
}
