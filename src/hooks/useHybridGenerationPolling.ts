import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeGeneration } from "./useRealtimeGeneration";
import { usePollingFallback } from "./usePollingFallback";
import { useGenerationCompletion } from "./useGenerationCompletion";
import { useGenerationStateSync } from "./useGenerationStateSync";
import type { GenerationOutput } from "./useGenerationState";

type ConnectionTier = 'realtime' | 'polling' | 'disconnected';

interface RealtimePayload {
  new: {
    id: string;
    status: string;
    storage_path?: string;
  };
}

interface UseHybridGenerationPollingOptions {
  onComplete: (outputs: GenerationOutput[], parentId: string) => void;
  onError?: (error: string) => void;
  onTimeout?: () => void;
}

/**
 * Three-tier hybrid polling system orchestrator:
 * 1. Primary: User-scoped Realtime subscription (useRealtimeGeneration)
 * 2. Fallback: Exponential backoff polling (usePollingFallback)
 * 3. Guards: State sync and stall detection (useGenerationStateSync)
 * 4. Completion: Process outputs (useGenerationCompletion)
 */
export const useHybridGenerationPolling = (options: UseHybridGenerationPollingOptions) => {
  const { user } = useAuth();
  const [isPolling, setIsPolling] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [connectionTier, setConnectionTier] = useState<ConnectionTier>('disconnected');
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Completion hook
  const { processCompletion, checkCompletion, clearCompletedCache } = useGenerationCompletion({
    onComplete: (outputs, parentId) => {
      optionsRef.current.onComplete(outputs, parentId);
      setIsPolling(false);
      setPollingId(null);
    },
    onError: (error) => {
      optionsRef.current.onError?.(error);
      setIsPolling(false);
      setPollingId(null);
    },
  });

  // Polling fallback hook
  const { startPolling: startFallbackPolling, stopPolling: stopFallbackPolling } = usePollingFallback({
    onComplete: processCompletion,
    onError: (error) => {
      optionsRef.current.onError?.(error);
      setIsPolling(false);
      setPollingId(null);
    },
  });

  // State sync hook
  const { handleChildUpdate, startStallGuard, clearTimers: clearSyncTimers } = useGenerationStateSync({
    generationId: pollingId || '',
    onChildActivity: () => pollingId && processCompletion(pollingId),
    onStallDetected: () => {
      if (pollingId) {
        setConnectionTier('polling');
        startFallbackPolling(pollingId);
      }
    },
  });

  // Realtime hook
  const { isConnected, subscribe, unsubscribe } = useRealtimeGeneration({
    userId: user?.id || '',
    generationId: pollingId || '',
    onUpdate: (payload: RealtimePayload) => {
      if (payload.new.id === pollingId &&
        (payload.new.status === 'completed' || payload.new.status === 'failed' || payload.new.status === 'error')) {
        processCompletion(payload.new.id);
      }
    },
    onChildUpdate: handleChildUpdate,
    onConnected: () => {
      setRealtimeConnected(true);
      setConnectionTier('realtime');

      // Clear fallback timeout
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    },
    onError: () => {
      setRealtimeConnected(false);
    },
  });

  /**
   * Start polling for a generation
   */
  const startPolling = useCallback(async (generationId: string) => {
    if (!user?.id) {
      logger.error('Cannot start polling: no user ID');
      return;
    }

    logger.info('Starting hybrid polling', { generationId, userId: user.id } as any);

    clearCompletedCache();
    setIsPolling(true);
    setPollingId(generationId);

    // Immediate status check - catch already-completed generations
    const { isComplete, status } = await checkCompletion(generationId);
    if (isComplete && status) {
      logger.info('Generation already complete, processing immediately', {
        generationId,
        status
      } as any);
      processCompletion(generationId);
      return;
    }

    // Set up stall guard (20 seconds)
    startStallGuard();

    // Set fallback timeout (5 seconds)
    fallbackTimeoutRef.current = setTimeout(() => {
      if (!isConnected) {
        logger.warn('Realtime timeout, falling back to polling', { generationId } as any);
        setConnectionTier('polling');
        startFallbackPolling(generationId);
      }
    }, 5000);

    // Try Realtime first
    subscribe();
  }, [user?.id, checkCompletion, processCompletion, startStallGuard, subscribe, isConnected, startFallbackPolling, clearCompletedCache]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    logger.info('Stopping polling');

    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }

    clearSyncTimers();
    stopFallbackPolling();
    unsubscribe();

    setIsPolling(false);
    setPollingId(null);
    setRealtimeConnected(false);
    setConnectionTier('disconnected');
    clearCompletedCache();
  }, [clearSyncTimers, stopFallbackPolling, unsubscribe, clearCompletedCache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      clearSyncTimers();
      unsubscribe();
    };
  }, [clearSyncTimers, unsubscribe]);

  return {
    startPolling,
    stopPolling,
    isPolling,
    pollingId,
    connectionTier,
    realtimeConnected,
  };
};
