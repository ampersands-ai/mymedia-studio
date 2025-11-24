import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error) && typeof error !== 'object') {
    return false;
  }

  const errorObj = error as { message?: string; code?: string; status?: number };
  const errorMessage = errorObj.message?.toLowerCase() || '';
  const errorCode = errorObj.code || '';

  return (
    errorMessage.includes('jwt') ||
    errorMessage.includes('session') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('not authenticated') ||
    errorCode === 'PGRST301' || // PostgREST auth required
    errorObj.status === 401
  );
}

async function handleAuthError() {
  logger.warn('Authentication session expired, signing out', {
    utility: 'queryClient',
    operation: 'handleAuthError'
  });
  
  try {
    await supabase.auth.signOut();
  } catch (e) {
    logger.error('Sign out during auth error handling failed', e as Error, {
      utility: 'queryClient',
      operation: 'handleAuthError'
    });
  }
  
  toast({
    title: "Session Expired",
    description: "Your session has expired. Please log in again.",
    variant: "destructive",
  });
  
  window.location.href = '/auth';
}

/**
 * Optimized React Query configuration
 * - Longer stale times to reduce unnecessary refetches
 * - Disabled refetch on window focus (better for production)
 * - Exponential backoff for retries
 * - Global auth error handling
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (prevent infinite cache growth)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error: Error) => {
        // Don't retry on auth errors
        if (isAuthError(error)) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnMount: false,
    },
    mutations: {
      retry: (failureCount, error: Error) => {
        if (isAuthError(error)) {
          return false;
        }
        return failureCount < 1;
      },
      onError: (error: Error) => {
        if (isAuthError(error)) {
          handleAuthError();
        }
      },
    },
  },
});
