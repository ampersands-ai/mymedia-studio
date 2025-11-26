import { useRef, useCallback } from "react";
import { logger } from "@/lib/logger";

interface RealtimePayload {
  new: {
    id: string;
    status: string;
    storage_path?: string;
  };
}

interface UseGenerationStateSyncOptions {
  getGenerationId: () => string;
  onChildActivity: () => void;
  onStallDetected: () => void;
}

/**
 * Hook for managing state synchronization and timing guards
 * Handles debouncing child updates and detecting stalls
 */
export const useGenerationStateSync = ({
  getGenerationId,
  onChildActivity,
  onStallDetected,
}: UseGenerationStateSyncOptions) => {
  const childDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const stallGuardRef = useRef<NodeJS.Timeout | null>(null);

  const handleChildUpdate = useCallback((payload: RealtimePayload) => {
    // If child has output, parent might be complete soon
    if (payload.new?.storage_path) {
      // Debounce to allow parent to flip to completed
      if (childDebounceRef.current) {
        clearTimeout(childDebounceRef.current);
      }
      childDebounceRef.current = setTimeout(() => {
        const generationId = getGenerationId();
        logger.info('Child output detected, processing completion', { generationId } as any);
        onChildActivity();
      }, 1000);
    }

    // Reset stall guard on any child activity
    if (stallGuardRef.current) {
      clearTimeout(stallGuardRef.current);
      stallGuardRef.current = setTimeout(() => {
        const generationId = getGenerationId();
        logger.warn('Stall guard triggered, switching to polling', { generationId } as any);
        onStallDetected();
      }, 20000);
    }
  }, [getGenerationId, onChildActivity, onStallDetected]);

  const startStallGuard = useCallback(() => {
    // Set up stall guard (20 seconds)
    stallGuardRef.current = setTimeout(() => {
      const generationId = getGenerationId();
      logger.warn('Stall guard triggered, switching to polling', { generationId } as any);
      onStallDetected();
    }, 20000);
  }, [getGenerationId, onStallDetected]);

  const clearTimers = useCallback(() => {
    if (childDebounceRef.current) {
      clearTimeout(childDebounceRef.current);
      childDebounceRef.current = null;
    }
    if (stallGuardRef.current) {
      clearTimeout(stallGuardRef.current);
      stallGuardRef.current = null;
    }
  }, []);

  return {
    handleChildUpdate,
    startStallGuard,
    clearTimers,
  };
};
