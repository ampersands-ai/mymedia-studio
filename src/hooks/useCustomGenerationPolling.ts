import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { POLLING_CONFIG } from "@/constants/custom-creation";
import type { GenerationOutput } from "@/types/custom-creation";

interface UseCustomGenerationPollingOptions {
  onComplete: (outputs: GenerationOutput[], parentId: string) => void;
  onError?: (error: string) => void;
  onTimeout?: () => void;
}

/**
 * Custom polling logic for generation status
 * - Dynamic intervals: 5s → 15s (2-5min) → 30s (5min+)
 * - Fetches parent + child generations
 * - Max 20-minute timeout
 */
export const useCustomGenerationPolling = (options: UseCustomGenerationPollingOptions) => {
  const [isPolling, setIsPolling] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  /**
   * Poll a single generation's status
   */
  const pollGenerationStatus = useCallback(async (generationId: string) => {
    try {
      // Fetch parent generation
      const { data: parentData, error: parentError } = await supabase
        .from('generations')
        .select('id, status, storage_path, type, output_index, is_batch_output')
        .eq('id', generationId)
        .single();

      if (parentError) throw parentError;

      // Check if generation is complete or failed
      if (parentData.status === 'completed' || parentData.status === 'failed') {
        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setPollingId(null);
        setIsPolling(false);

        if (parentData.status === 'failed') {
          // Fetch error details
          const { data: fullGenData } = await supabase
            .from('generations')
            .select('provider_response')
            .eq('id', generationId)
            .single();
          
          const providerResponse = fullGenData?.provider_response as any;
          const errorMessage = providerResponse?.error || 
                               providerResponse?.full_response?.data?.failMsg ||
                               'Generation failed. Please try again.';
          
          toast.error('Generation failed', {
            description: errorMessage,
            id: 'generation-progress',
            duration: 8000
          });
          
          options.onError?.(errorMessage);
        } else if (parentData.status === 'completed') {
          // Fetch all child outputs
          const { data: childrenData, error: childrenError } = await supabase
            .from('generations')
            .select('id, storage_path, output_url, output_index, type')
            .eq('parent_generation_id', generationId)
            .eq('type', parentData.type) // Only fetch same type
            .order('output_index', { ascending: true });

          if (childrenError) {
            console.error('Error fetching children:', childrenError);
          }

          // Build valid outputs
          const allOutputs = [
            {
              id: parentData.id,
              storage_path: parentData.storage_path,
              output_index: 0
            },
            ...(childrenData || [])
          ];

          // Filter to only outputs with storage_path
          const validOutputs = allOutputs.filter(o => !!o.storage_path);

          // Remove duplicates by storage_path
          const uniqueOutputs = validOutputs.filter((output, index, self) =>
            index === self.findIndex(o => o.storage_path === output.storage_path)
          );

          if (uniqueOutputs.length === 0) {
            console.error('No valid outputs found with storage_path');
            toast.error('Generation completed but outputs are not ready. Please check History.', {
              id: 'generation-progress'
            });
            options.onError?.('No valid outputs');
            return;
          }

          options.onComplete(uniqueOutputs, generationId);
        }
      } else {
        // Still processing - check for child video generations if audio
        if (parentData.type === 'audio') {
          const { data: videoChildren } = await supabase
            .from('generations')
            .select('id, storage_path, output_index, status, type')
            .eq('parent_generation_id', generationId)
            .in('type', ['audio', 'video'])
            .order('output_index', { ascending: true });

          if (videoChildren && videoChildren.length > 0) {
            queryClient.invalidateQueries({ 
              queryKey: ['child-video-generations', generationId] 
            });
          }
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [options, queryClient]);

  /**
   * Start polling with dynamic intervals
   */
  const startPolling = useCallback((generationId: string) => {
    setPollingId(generationId);
    setIsPolling(true);
    
    const startTime = Date.now();
    
    // Immediate check at 1 second
    setTimeout(() => {
      pollGenerationStatus(generationId);
    }, POLLING_CONFIG.IMMEDIATE_CHECK);
    
    const pollWithDynamicInterval = () => {
      const elapsed = Date.now() - startTime;
      
      // Timeout check
      if (elapsed >= POLLING_CONFIG.MAX_DURATION) {
        stopPolling();
        options.onTimeout?.();
        toast.info('Generation is taking longer than expected. Check History for updates.', { 
          id: 'generation-progress' 
        });
        return;
      }
      
      // Dynamic interval based on elapsed time
      let newInterval: number;
      if (elapsed < POLLING_CONFIG.FAST_THRESHOLD) {
        newInterval = POLLING_CONFIG.FAST_INTERVAL; // 5s for first 2 minutes
      } else if (elapsed < POLLING_CONFIG.SLOW_THRESHOLD) {
        newInterval = POLLING_CONFIG.MEDIUM_INTERVAL; // 10s for 2-5 minutes
      } else {
        newInterval = POLLING_CONFIG.SLOW_INTERVAL; // 20s after 5 minutes
      }
      
      // Restart interval if changed
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      pollIntervalRef.current = setInterval(() => {
        pollGenerationStatus(generationId);
        pollWithDynamicInterval(); // Recalculate interval
      }, newInterval);
      
      pollGenerationStatus(generationId);
    };
    
    // Start dynamic polling
    pollWithDynamicInterval();
  }, [pollGenerationStatus, options]);

  /**
   * Stop polling manually
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPollingId(null);
    setIsPolling(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  return {
    startPolling,
    stopPolling,
    isPolling,
    pollingId,
  };
};
