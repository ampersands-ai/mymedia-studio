import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { POLLING_CONFIG } from "@/constants/generation";
import type { GenerationOutput } from "./useGenerationState";
import { logger } from "@/lib/logger";

/**
 * Polling options and callbacks
 */
interface UseGenerationPollingOptions {
  onComplete: (outputs: GenerationOutput[], parentId: string) => void;
  onError?: (error: string) => void;
  onTimeout?: () => void;
}

/**
 * Hook to poll generation status with progressive intervals
 * @param options - Callbacks for completion, error, and timeout
 * @returns Polling controls and state
 */
export const useGenerationPolling = (options: UseGenerationPollingOptions) => {
  const [isPolling, setIsPolling] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);
  
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);

  /**
   * Clear all timeouts and intervals
   */
  const clearAllTimers = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    intervalsRef.current.forEach(clearInterval);
    timeoutsRef.current = [];
    intervalsRef.current = [];
  }, []);

  /**
   * Poll generation status once
   */
  const pollStatus = useCallback(async (generationId: string) => {
    try {
      logger.info('Polling generation status', { 
        generationId,
        timestamp: new Date().toISOString() 
      } as any);
      
      // Fetch parent generation with model info
      const { data: parentData, error } = await supabase
        .from('generations')
        .select(`
          id,
          status,
          storage_path,
          type,
          created_at,
          provider_task_id,
          model_id,
          model_record_id,
          provider_response,
          ai_models!inner(provider)
        `)
        .eq('id', generationId)
        .single();

      if (error) {
        logger.error('Failed to fetch generation', error, { generationId });
        throw error;
      }

      logger.info('Generation status fetched', {
        generationId,
        status: parentData.status,
        hasStoragePath: !!parentData.storage_path,
        storagePath: parentData.storage_path?.substring(0, 50)
      } as any);

      // Treat 'cancelled' as terminal state
      if (parentData.status === 'cancelled') {
        clearAllTimers();
        setIsPolling(false);
        setPollingId(null);
        options.onError?.('Generation cancelled');
        return;
      }

      if (parentData.status === 'completed' || parentData.status === 'failed') {
        logger.info('Generation reached terminal state', {
          generationId,
          status: parentData.status
        } as any);

        clearAllTimers();
        setIsPolling(false);
        setPollingId(null);

        if (parentData.status === 'completed') {
          // Retry logic for child generations
          let retryCount = 0;
          const maxRetries = 3;
          const retryDelay = 2000; // 2 seconds
          
          let validOutputs: GenerationOutput[] = [];
          
          logger.info('Starting child generation fetch', { 
            generationId,
            maxRetries 
          } as any);

          // Retry loop for fetching children
          while (retryCount <= maxRetries) {
            const { data: childrenData } = await supabase
              .from('generations')
              .select(`
                id, 
                storage_path, 
                output_index, 
                type,
                provider_task_id,
                model_id,
                model_record_id,
                ai_models!inner(provider)
              `)
              .eq('parent_generation_id', generationId)
              .eq('type', parentData.type)
              .order('output_index', { ascending: true });

            // Extract provider from nested model data
            const parentProvider = (parentData.ai_models as { provider?: string })?.provider || null;

            // Build all outputs (parent + children)
            const allOutputs: GenerationOutput[] = [
              {
                id: parentData.id,
                storage_path: parentData.storage_path,
                output_index: 0,
                provider_task_id: parentData.provider_task_id || undefined,
                model_id: parentData.model_id || undefined,
                provider: parentProvider || undefined
              },
              ...(childrenData || []).map((child: Record<string, unknown>): GenerationOutput => ({
                id: child.id as string,
                storage_path: child.storage_path as string,
                output_index: child.output_index as number,
                provider_task_id: (child.provider_task_id as string) || undefined,
                model_id: (child.model_id as string) || undefined,
                provider: ((child.ai_models as { provider?: string })?.provider) || undefined
              }))
            ];

            // Filter valid outputs with storage_path
            validOutputs = allOutputs.filter(o => !!o.storage_path);
            
            logger.info('Outputs fetched', {
              generationId,
              allOutputsCount: allOutputs.length,
              validOutputsCount: validOutputs.length,
              childrenCount: childrenData?.length || 0,
              retryCount,
              parentHasPath: !!parentData.storage_path
            } as any);
            
            // If we have outputs OR max retries reached, break
            if (validOutputs.length > 0 || retryCount === maxRetries) {
              break;
            }
            
            // Wait before retry
            logger.debug('No outputs ready, retrying', { 
              generationId,
              retryCount: retryCount + 1,
              maxRetries,
              delayMs: retryDelay
            } as any);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryCount++;
          }
          
          // Remove duplicates by storage_path
          const uniqueOutputs = validOutputs.filter((output, index, self) =>
            index === self.findIndex(o => o.storage_path === output.storage_path)
          );

          if (uniqueOutputs.length === 0) {
            logger.error('Generation completed but outputs not ready', undefined, {
              generationId,
              retriesUsed: retryCount,
              parentStoragePath: parentData.storage_path,
              allOutputsCount: validOutputs.length
            } as any);
            options.onError?.('Generation completed but outputs are not ready after retries.');
            return;
          }

          logger.info('✅ Generation complete - calling onComplete', {
            generationId,
            outputCount: uniqueOutputs.length,
            retriesUsed: retryCount,
            firstOutputPath: uniqueOutputs[0]?.storage_path?.substring(0, 50)
          } as any);

          // Call completion callback with parent ID
          options.onComplete(uniqueOutputs, generationId);
        } else {
          // Failed generation - extract detailed error
          const providerResponse = parentData.provider_response as any;
          const errorMessage = providerResponse?.error || 'Generation failed';
          options.onError?.(errorMessage);
        }
      }
    } catch (error: any) {
      logger.error('Polling error', error, { generationId } as any);
      options.onError?.(error.message || 'Failed to check generation status');
    }
  }, [options, clearAllTimers]);

  /**
   * Start polling for a generation
   */
  const startPolling = useCallback((generationId: string) => {
    if (isPolling) {
      logger.warn('Already polling, stopping previous poll', { 
        currentPollingId: pollingId,
        newGenerationId: generationId
      } as any);
      stopPolling();
    }

    logger.info('Starting generation polling', { generationId } as any);
    setIsPolling(true);
    setPollingId(generationId);
    const startTime = Date.now();

    // TIER 1: Immediate check at 1 second
    const immediateTimeout = setTimeout(() => {
      pollStatus(generationId);
    }, POLLING_CONFIG.IMMEDIATE_CHECK);
    timeoutsRef.current.push(immediateTimeout);

    // TIER 2: Early check at 3 seconds
    const initialTimeout = setTimeout(() => {
      pollStatus(generationId);
    }, POLLING_CONFIG.INITIAL_DELAY);
    timeoutsRef.current.push(initialTimeout);

    // TIER 3: Fast polling (5s intervals) for first 2 minutes
    const fastInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= POLLING_CONFIG.FAST_DURATION) {
        clearInterval(fastInterval);
      } else {
        pollStatus(generationId);
      }
    }, POLLING_CONFIG.FAST_INTERVAL);
    intervalsRef.current.push(fastInterval);

    // TIER 4: Medium polling (10s intervals) from 2-5 minutes
    const mediumIntervalTimeout = setTimeout(() => {
      const mediumInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= POLLING_CONFIG.MEDIUM_DURATION) {
          clearInterval(mediumInterval);
        } else {
          pollStatus(generationId);
        }
      }, POLLING_CONFIG.MEDIUM_INTERVAL);
      intervalsRef.current.push(mediumInterval);
    }, POLLING_CONFIG.FAST_DURATION);
    timeoutsRef.current.push(mediumIntervalTimeout);

    // TIER 5: Slow polling (20s intervals) after 5 minutes
    const slowIntervalTimeout = setTimeout(() => {
      const slowInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        // Max timeout check
        if (elapsed >= POLLING_CONFIG.MAX_DURATION) {
          clearAllTimers();
          setIsPolling(false);
          setPollingId(null);
          options.onTimeout?.();
          return;
        }

        pollStatus(generationId);
      }, POLLING_CONFIG.SLOW_INTERVAL);
      intervalsRef.current.push(slowInterval);
    }, POLLING_CONFIG.MEDIUM_DURATION);
    timeoutsRef.current.push(slowIntervalTimeout);
  }, [isPolling, pollStatus, options, clearAllTimers]);

  /**
   * Stop polling manually
   */
  const stopPolling = useCallback(() => {
    clearAllTimers();
    setIsPolling(false);
    setPollingId(null);
  }, [clearAllTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isPolling) {
        logger.info('useGenerationPolling unmounting, cleaning up polling');
      }
      clearAllTimers();
    };
  }, [clearAllTimers, isPolling]);

  // Auto-recovery: Force reset if polling for more than 30 minutes
  useEffect(() => {
    if (isPolling && pollingId) {
      const timeout = setTimeout(() => {
        logger.warn('Polling exceeded maximum duration (30 min), force resetting', {
          pollingId,
          duration: '30 minutes'
        } as any);
        
        stopPolling();
        options.onTimeout?.();
      }, 30 * 60 * 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [isPolling, pollingId, stopPolling, options]);

  return {
    startPolling,
    stopPolling,
    isPolling,
    pollingId,
  };
};
