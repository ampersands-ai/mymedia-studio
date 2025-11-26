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
  pollingIdRef: React.MutableRefObject<string | null>;
  onChildActivity: () => void;
  onStallDetected: () => void;
}

/**
 * Hook for managing state synchronization and timing guards
 * Handles debouncing child updates and detecting stalls
 */
export const useGenerationStateSync = ({
  pollingIdRef,
  onChildActivity,
  onStallDetected,
}: UseGenerationStateSyncOptions) => {
  const childDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const stallGuardRef = useRef<NodeJS.Timeout | null>(null);

  const handleChildUpdate = useCallback((payload: RealtimePayload) => {
    // Capture current generationId when handling child update
    const currentGenerationId = pollingIdRef.current;
    
    // If child has output, parent might be complete soon
    if (payload.new?.storage_path) {
      // Debounce to allow parent to flip to completed
      if (childDebounceRef.current) {
        clearTimeout(childDebounceRef.current);
      }
      childDebounceRef.current = setTimeout(() => {
        // Verify generationId is still active
        if (pollingIdRef.current === currentGenerationId && currentGenerationId) {
          logger.info('Child output detected, processing completion', { generationId: currentGenerationId } as any);
          onChildActivity();
        }
      }, 1000);
    }

    // Reset stall guard on any child activity
    if (stallGuardRef.current && currentGenerationId) {
      clearTimeout(stallGuardRef.current);
      // Capture generationId for the timeout
      const capturedId = currentGenerationId;
      stallGuardRef.current = setTimeout(() => {
        // Verify generationId is still active before triggering
        if (pollingIdRef.current === capturedId) {
          logger.warn('Stall guard triggered, switching to polling', { generationId: capturedId } as any);
          onStallDetected();
        } else {
          logger.debug('Stall guard fired but generation ID changed, ignoring', {
            originalId: capturedId,
            currentId: pollingIdRef.current
          } as any);
        }
      }, 20000);
    }
  }, [pollingIdRef, onChildActivity, onStallDetected]);

  const startStallGuard = useCallback(() => {
    // Capture the current generationId when setting up the guard
    const currentGenerationId = pollingIdRef.current;
    if (!currentGenerationId) {
      logger.warn('Cannot start stall guard: no generation ID', {} as any);
      return;
    }

    // Clear any existing stall guard
    if (stallGuardRef.current) {
      clearTimeout(stallGuardRef.current);
    }

    // Set up stall guard (20 seconds) - use captured ID
    stallGuardRef.current = setTimeout(() => {
      // Verify generationId is still active before triggering
      if (pollingIdRef.current === currentGenerationId) {
        logger.warn('Stall guard triggered, switching to polling', { generationId: currentGenerationId } as any);
        onStallDetected();
      } else {
        logger.debug('Stall guard fired but generation ID changed, ignoring', {
          originalId: currentGenerationId,
          currentId: pollingIdRef.current
        } as any);
      }
    }, 20000);
  }, [pollingIdRef, onStallDetected]);

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
