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
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (prevent infinite cache growth)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Remove on unmount to prevent memory leaks
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
