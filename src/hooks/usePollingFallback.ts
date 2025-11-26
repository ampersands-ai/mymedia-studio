import { useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

interface UsePollingFallbackOptions {
  onComplete: (generationId: string, status: string) => Promise<void>;
  onError: (error: string) => void;
}

/**
 * Hook for polling generation status with exponential backoff
 * Tier 3: Fallback mechanism when realtime is unavailable
 */
export const usePollingFallback = ({ onComplete, onError }: UsePollingFallbackOptions) => {
  const [isPolling, setIsPolling] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const startPolling = useCallback((generationId: string) => {
    logger.info('Starting fallback polling', { generationId } as any);
    setIsPolling(true);

    toast.info('Using slower updates mode', {
      description: 'Real-time updates unavailable, polling for status',
      duration: 3000,
    });

    // More responsive intervals: 2s → 3s → 5s → 8s (max)
    const intervals = [2000, 3000, 5000, 8000];
    let attempt = 0;

    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from('generations')
          .select('status, id, provider_response')
          .eq('id', generationId)
          .single();

        if (error) throw error;

        if (data?.status === 'completed' || data?.status === 'failed' || data?.status === 'error') {
          await onComplete(generationId, data.status);
          setIsPolling(false);
          clearTimers();
          return;
        }

        // Fallback: Search for recently completed generation after 3 attempts
        if (data?.status === 'pending' && attempt >= 3) {
          logger.info('Record still pending after 3 attempts, searching for fallback', { 
            generationId,
            attempt 
          } as any);

          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: recentCompleted, error: searchError } = await supabase
              .from('generations')
              .select('id, status, storage_path')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .not('storage_path', 'is', null)
              .gte('created_at', new Date(Date.now() - 30000).toISOString())
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (!searchError && recentCompleted && recentCompleted.id !== generationId) {
              logger.info('Found fallback completed generation', { 
                originalId: generationId, 
                fallbackId: recentCompleted.id 
              } as any);
              await onComplete(recentCompleted.id, 'completed');
              setIsPolling(false);
              clearTimers();
              return;
            }
          }
        }

        // Schedule next poll with exponential backoff (max 8s instead of 30s)
        const interval = intervals[Math.min(attempt, intervals.length - 1)];
        attempt++;

        const timeout = setTimeout(poll, interval);
        timeoutsRef.current.push(timeout);
      } catch (error) {
        logger.error('Polling error', error, { generationId });
        onError('Failed to check generation status');
        setIsPolling(false);
        clearTimers();
      }
    };

    poll();
  }, [onComplete, onError, clearTimers]);

  const stopPolling = useCallback(() => {
    logger.info('Stopping polling');
    clearTimers();
    setIsPolling(false);
  }, [clearTimers]);

  return {
    isPolling,
    startPolling,
    stopPolling,
  };
};
