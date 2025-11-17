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
 *
 * MEMORY LEAK FIX: Uses refs to store callbacks to prevent unnecessary re-renders
 * and timer recreation when parent components re-render.
 */
export const useGenerationPolling = (options: UseGenerationPollingOptions) => {
  const [isPolling, setIsPolling] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);

  // Store callbacks in refs to prevent re-creation of pollStatus and startPolling
  // This prevents memory leaks from unstable dependencies
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

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
      console.log('🔍 Polling generation status', { 
        generationId,
        timestamp: new Date().toISOString() 
      });
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

      console.log('📊 Generation status fetched', {
        generationId,
        status: parentData.status,
        hasStoragePath: !!parentData.storage_path,
        storagePath: parentData.storage_path?.substring(0, 50)
      });
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
        optionsRef.current.onError?.('Generation cancelled');
        return;
      }

      if (parentData.status === 'completed' || parentData.status === 'failed') {
        logger.info('Generation reached terminal state', {
          generationId,
          status: parentData.status
        } as any);

        if (parentData.status === 'completed') {
          // Fetch children dynamically
          const { data: childrenData } = await supabase
            .from('generations')
            .select(`id, storage_path, output_index, provider_task_id, model_id, ai_models!inner(provider)`)
            .eq('parent_generation_id', generationId)
            .order('output_index', { ascending: true });

          const parentProvider = (parentData.ai_models as { provider?: string })?.provider || null;
          
          const allOutputs: GenerationOutput[] = [
            {
              id: parentData.id,
              storage_path: parentData.storage_path,
              output_index: 0,
              provider_task_id: parentData.provider_task_id || undefined,
              model_id: parentData.model_id || undefined,
              provider: parentProvider || undefined
            },
            ...(childrenData || []).map((child: any) => ({
              id: child.id,
              storage_path: child.storage_path,
              output_index: child.output_index,
              provider_task_id: child.provider_task_id || undefined,
              model_id: child.model_id || undefined,
              provider: ((child.ai_models as { provider?: string })?.provider) || undefined
            }))
          ];

          const validOutputs = allOutputs.filter(o => !!o.storage_path);
          const uniqueOutputs = validOutputs.filter((output, index, self) =>
            index === self.findIndex(o => o.storage_path === output.storage_path)
          );

          if (uniqueOutputs.length > 0) {
            // We have outputs - stop polling and complete
            console.log('✅ About to call onComplete', {
              generationId,
              outputCount: uniqueOutputs.length,
              outputs: uniqueOutputs.map(o => ({ id: o.id, hasPath: !!o.storage_path }))
            });
            
            clearAllTimers();
            setIsPolling(false);
            setPollingId(null);
            optionsRef.current.onComplete?.(uniqueOutputs, generationId);
            
            console.log('✅ onComplete called successfully');
            return;
          }
          
          // No outputs yet - continue polling (don't stop, don't clear timers)
          logger.info('Generation completed but outputs not ready yet, continuing to poll', {
            generationId,
            parentHasPath: !!parentData.storage_path,
            childrenCount: childrenData?.length || 0
          } as any);
          return;
        } else {
          // Failed generation - extract detailed error
          clearAllTimers();
          setIsPolling(false);
          setPollingId(null);
          const providerResponse = parentData.provider_response as any;
          const errorMessage = providerResponse?.error || 'Generation failed';
          optionsRef.current.onError?.(errorMessage);
        }
      }
    } catch (error: any) {
      logger.error('Polling error', error, { generationId } as any);
      clearAllTimers();
      setIsPolling(false);
      setPollingId(null);
      optionsRef.current.onError?.(error.message || 'Unknown error during polling');
    }
  }, [clearAllTimers]);

  /**
   * Start polling with progressive intervals
   */
  const startPolling = useCallback((generationId: string) => {
    if (isPolling && pollingId === generationId) {
      logger.debug('Already polling this generation', { generationId } as any);
      return;
    }

    clearAllTimers();
    setIsPolling(true);
    setPollingId(generationId);

    logger.info('Starting generation polling', { generationId } as any);

    const startTime = Date.now();

    const scheduleNext = () => {
      const elapsed = Date.now() - startTime;
      
      let interval: number;
      if (elapsed < POLLING_CONFIG.FAST_DURATION) {
        interval = POLLING_CONFIG.FAST_INTERVAL;
      } else if (elapsed < POLLING_CONFIG.FAST_DURATION + POLLING_CONFIG.MEDIUM_DURATION) {
        interval = POLLING_CONFIG.MEDIUM_INTERVAL;
      } else {
        interval = POLLING_CONFIG.SLOW_INTERVAL;
      }

      const timeout = setTimeout(() => {
        pollStatus(generationId);
        scheduleNext();
      }, interval);

      timeoutsRef.current.push(timeout);
    };

    // Initial poll
    pollStatus(generationId);
    scheduleNext();
  }, [isPolling, pollingId, clearAllTimers, pollStatus]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    logger.info('Stopping generation polling', { pollingId } as any);
    clearAllTimers();
    setIsPolling(false);
    setPollingId(null);
  }, [clearAllTimers, pollingId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Safety timeout: force-stop polling after excessive duration
  useEffect(() => {
    if (isPolling && pollingId) {
      const safetyTimeout = setTimeout(() => {
        logger.warn('Polling safety timeout reached', {
          generationId: pollingId,
          duration: POLLING_CONFIG.MAX_DURATION
        } as any);
        clearAllTimers();
        setIsPolling(false);
        setPollingId(null);
        optionsRef.current.onTimeout?.();
      }, POLLING_CONFIG.MAX_DURATION);

      return () => clearTimeout(safetyTimeout);
    }
  }, [isPolling, pollingId, clearAllTimers]);

  return {
    startPolling,
    stopPolling,
    isPolling,
    pollingId,
  };
};
