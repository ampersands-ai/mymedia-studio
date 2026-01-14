import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getPublicImageUrl } from '@/lib/supabase-images';

// Timeout constants aligned with system standards
export const IMAGE_GENERATION_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes
export const VIDEO_GENERATION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

// Polling configuration
const POLL_INTERVAL_MS = 5000; // 5 seconds between polls

interface ActivePoll {
  generationId: string;
  abortController: AbortController;
}

/**
 * Direct database polling hook for Blackboard storyboard.
 * 
 * Key differences from the shared useGenerationPolling:
 * - Each generation polls independently (no shared state conflicts)
 * - Uses direct database queries (no Realtime dependency)
 * - Supports unlimited concurrent generations
 * - Each poll has its own timeout and cleanup
 * 
 * This fixes the issue where the shared polling hook could only
 * track one generation at a time, causing orphaned promises.
 */
export const useBlackboardPolling = () => {
  const activePolls = useRef<Map<string, ActivePoll>>(new Map());

  /**
   * Poll a single generation directly from the database
   * Returns the output URL when complete, or null on failure
   */
  const pollGenerationDirectly = useCallback(async (
    generationId: string,
    timeoutMs: number,
    abortSignal: AbortSignal
  ): Promise<string | null> => {
    const startTime = Date.now();
    const maxAttempts = Math.ceil(timeoutMs / POLL_INTERVAL_MS);
    let attempts = 0;

    logger.info('Starting direct poll for generation', {
      generationId,
      timeoutMs,
      maxAttempts,
      component: 'useBlackboardPolling'
    });

    while (attempts < maxAttempts && !abortSignal.aborted) {
      attempts++;

      try {
        const { data, error } = await supabase
          .from('generations')
          .select('id, status, output_url, storage_path')
          .eq('id', generationId)
          .single();

        if (abortSignal.aborted) {
          logger.info('Poll aborted', { generationId, component: 'useBlackboardPolling' });
          return null;
        }

        if (error) {
          logger.warn('Poll query error, will retry', {
            generationId,
            error: error.message,
            attempt: attempts,
            component: 'useBlackboardPolling'
          });
          // Continue polling on transient errors
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
          continue;
        }

        // Check for completion
        if (data?.status === 'completed' || data?.status === 'complete') {
          const outputUrl = data.output_url || 
            (data.storage_path ? getPublicImageUrl(data.storage_path) : null);
          
          logger.info('Generation completed via direct poll', {
            generationId,
            outputUrl,
            attempts,
            elapsedMs: Date.now() - startTime,
            component: 'useBlackboardPolling'
          });
          
          return outputUrl;
        }

        // Check for failure
        if (data?.status === 'failed' || data?.status === 'error') {
          logger.error('Generation failed', new Error('Generation status is failed'), {
            generationId,
            status: data.status,
            component: 'useBlackboardPolling'
          });
          throw new Error('Generation failed');
        }

        // Still pending, wait and retry
        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        }
      } catch (error) {
        if (abortSignal.aborted) return null;
        
        // If it's our own failure error, rethrow
        if (error instanceof Error && error.message === 'Generation failed') {
          throw error;
        }
        
        logger.warn('Poll attempt failed', {
          generationId,
          error: error instanceof Error ? error.message : String(error),
          attempt: attempts,
          component: 'useBlackboardPolling'
        });
        
        // Continue polling on other errors
        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        }
      }
    }

    // Timeout reached
    const elapsedMs = Date.now() - startTime;
    logger.warn('Generation timed out', {
      generationId,
      timeoutMs,
      elapsedMs,
      attempts,
      component: 'useBlackboardPolling'
    });
    
    throw new Error(`Generation timed out after ${Math.round(elapsedMs / 1000)} seconds`);
  }, []);

  /**
   * Wait for a generation to complete using direct database polling
   * Each call is independent - supports unlimited concurrent generations
   * 
   * @param generationId - The generation ID to poll for
   * @param timeoutMs - Maximum wait time (default: 5 min for images)
   * @returns Promise resolving to the output URL or null
   */
  const waitForGeneration = useCallback(async (
    generationId: string,
    timeoutMs: number = IMAGE_GENERATION_TIMEOUT_MS
  ): Promise<string | null> => {
    // Create abort controller for this specific poll
    const abortController = new AbortController();
    
    // Track active poll
    activePolls.current.set(generationId, {
      generationId,
      abortController
    });

    try {
      const result = await pollGenerationDirectly(
        generationId,
        timeoutMs,
        abortController.signal
      );
      return result;
    } finally {
      // Cleanup
      activePolls.current.delete(generationId);
    }
  }, [pollGenerationDirectly]);

  /**
   * Cancel a specific generation's polling
   */
  const cancelGeneration = useCallback((generationId: string) => {
    const poll = activePolls.current.get(generationId);
    if (poll) {
      logger.info('Cancelling poll for generation', { generationId, component: 'useBlackboardPolling' });
      poll.abortController.abort();
      activePolls.current.delete(generationId);
    }
  }, []);

  /**
   * Cleanup all pending polling operations
   * Call this on component unmount or when cancelling all
   */
  const cleanup = useCallback(() => {
    const count = activePolls.current.size;
    if (count > 0) {
      logger.info('Cleaning up all active polls', {
        count,
        component: 'useBlackboardPolling'
      });
    }

    activePolls.current.forEach((poll) => {
      poll.abortController.abort();
    });
    activePolls.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    waitForGeneration,
    cancelGeneration,
    cleanup,
    isPolling: activePolls.current.size > 0,
    activeCount: activePolls.current.size,
  };
};
