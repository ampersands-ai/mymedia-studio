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
      staleTime: 5 * 60 * 1000, // 5 minutes - homepage data doesn't change often
      gcTime: 10 * 60 * 1000, // 10 minutes (prevent infinite cache growth)
      refetchOnWindowFocus: false, // Disabled for better UX
      refetchOnReconnect: true, // Re-enable for connection recovery
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnMount: false, // Use cache-first strategy for homepage
    },
    mutations: {
      retry: 1,
    },
  },
});
