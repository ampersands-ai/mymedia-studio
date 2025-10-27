import { QueryClient } from '@tanstack/react-query';

/**
 * Optimized React Query configuration
 * - Longer stale times to reduce unnecessary refetches
 * - Disabled refetch on window focus (better for production)
 * - Exponential backoff for retries
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Data is immediately stale - refetch on mount by default
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 min in case of remount
      refetchOnWindowFocus: true, // Re-enable for real-time updates
      refetchOnReconnect: true,
      refetchOnMount: true, // CRITICAL: Always fetch fresh data on mount
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});
