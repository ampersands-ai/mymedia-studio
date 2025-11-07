import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { POLLING_CONFIG } from "@/constants/generation";
import type { GenerationOutput } from "./useGenerationState";

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
      // Fetch parent generation
      const { data: parentData, error } = await supabase
        .from('generations')
        .select('id, status, storage_path, type')
        .eq('id', generationId)
        .single();

      if (error) throw error;

      if (parentData.status === 'completed' || parentData.status === 'failed') {
        clearAllTimers();
        setIsPolling(false);
        setPollingId(null);

        if (parentData.status === 'completed') {
          // Fetch child generations (batch outputs)
          const { data: childrenData } = await supabase
            .from('generations')
            .select('id, storage_path, output_index, type')
            .eq('parent_generation_id', generationId)
            .eq('type', parentData.type)
            .order('output_index', { ascending: true });

          // Build all outputs (parent + children)
          const allOutputs: GenerationOutput[] = [
            {
              id: parentData.id,
              storage_path: parentData.storage_path,
              output_index: 0
            },
            ...(childrenData || [])
          ];

          // Filter valid outputs with storage_path
          const validOutputs = allOutputs.filter(o => !!o.storage_path);
          
          // Remove duplicates by storage_path
          const uniqueOutputs = validOutputs.filter((output, index, self) =>
            index === self.findIndex(o => o.storage_path === output.storage_path)
          );

          if (uniqueOutputs.length === 0) {
            options.onError?.('Generation completed but outputs are not ready.');
            return;
          }

          // Call completion callback with parent ID
          options.onComplete(uniqueOutputs, generationId);
        } else {
          // Failed generation
          options.onError?.('Generation failed');
        }
      }
    } catch (error: any) {
      console.error('Polling error:', error);
      options.onError?.(error.message || 'Failed to check generation status');
    }
  }, [options, clearAllTimers]);

  /**
   * Start polling for a generation
   */
  const startPolling = useCallback((generationId: string) => {
    if (isPolling) {
      console.warn('Already polling, stopping previous poll');
      stopPolling();
    }

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
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    startPolling,
    stopPolling,
    isPolling,
    pollingId,
  };
};
