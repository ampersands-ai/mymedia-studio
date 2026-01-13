import { useCallback, useRef, useEffect } from 'react';
import { useGenerationPolling } from '@/hooks/useGenerationPolling';
import type { GenerationOutput } from '@/hooks/useGenerationState';
import { logger } from '@/lib/logger';
import { getPublicImageUrl } from '@/lib/supabase-images';

interface PendingResolver {
  resolve: (url: string | null) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

/**
 * Adapter hook that wraps the existing hybrid polling system
 * to provide promise-based results for the Blackboard storyboard.
 * 
 * Uses the scalable 3-tier architecture:
 * 1. Supabase Realtime (primary) - WebSocket-based, O(1) connections
 * 2. Exponential backoff polling (fallback) - graceful degradation
 * 3. State sync guards - stall detection and recovery
 * 
 * This approach scales to 10,000s of concurrent generations without
 * overwhelming the database with polling queries.
 */
export const useBlackboardPolling = () => {
  const resolversRef = useRef<Map<string, PendingResolver>>(new Map());
  const activePollingIdRef = useRef<string | null>(null);

  const { startPolling, stopPolling, isPolling } = useGenerationPolling({
    onComplete: (outputs: GenerationOutput[], parentId: string) => {
      const resolver = resolversRef.current.get(parentId);
      if (resolver) {
        clearTimeout(resolver.timeoutId);
        resolversRef.current.delete(parentId);
        activePollingIdRef.current = null;
        
        // Convert storage_path to a full public URL
        const storagePath = outputs[0]?.storage_path || null;
        const outputUrl = storagePath ? getPublicImageUrl(storagePath) : null;
        
        logger.info('Blackboard polling complete', { 
          parentId, 
          storagePath,
          outputUrl,
          component: 'useBlackboardPolling'
        });
        
        resolver.resolve(outputUrl);
      }
    },
    onError: (error: string) => {
      logger.error('Blackboard polling error', new Error(error), {
        component: 'useBlackboardPolling'
      });

      // Reject all pending resolvers
      resolversRef.current.forEach((resolver) => {
        clearTimeout(resolver.timeoutId);
        resolver.reject(new Error(error));
      });
      resolversRef.current.clear();
      activePollingIdRef.current = null;
    },
    onTimeout: () => {
      logger.warn('Blackboard polling timeout from hybrid system', {
        component: 'useBlackboardPolling'
      });

      resolversRef.current.forEach((resolver) => {
        clearTimeout(resolver.timeoutId);
        resolver.reject(new Error('Generation timed out'));
      });
      resolversRef.current.clear();
      activePollingIdRef.current = null;
    },
  });

  /**
   * Wait for a generation to complete using the hybrid polling system
   * @param generationId - The generation ID to poll for
   * @param timeoutMs - Maximum wait time (default: 90s for images, 600s for videos)
   * @returns Promise resolving to the output URL or null
   */
  const waitForGeneration = useCallback((
    generationId: string,
    timeoutMs: number = 90000
  ): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      logger.info('Starting waitForGeneration', { 
        generationId, 
        timeoutMs,
        component: 'useBlackboardPolling'
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        logger.warn('Generation timed out', { 
          generationId, 
          timeoutMs,
          component: 'useBlackboardPolling'
        });
        
        resolversRef.current.delete(generationId);
        stopPolling();
        activePollingIdRef.current = null;
        reject(new Error(`Generation timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);

      // Store resolver for this generation
      resolversRef.current.set(generationId, { resolve, reject, timeoutId });
      activePollingIdRef.current = generationId;

      // Start the hybrid polling system (Realtime + fallback)
      startPolling(generationId);
    });
  }, [startPolling, stopPolling]);

  /**
   * Cleanup all pending operations
   * Call this on component unmount or when cancelling
   */
  const cleanup = useCallback(() => {
    logger.info('Cleaning up blackboard polling', {
      pendingCount: resolversRef.current.size,
      component: 'useBlackboardPolling'
    });

    resolversRef.current.forEach((resolver) => {
      clearTimeout(resolver.timeoutId);
    });
    resolversRef.current.clear();
    activePollingIdRef.current = null;
    stopPolling();
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    waitForGeneration,
    cleanup,
    isPolling,
  };
};
