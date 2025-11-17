import { useHybridGenerationPolling } from "./useHybridGenerationPolling";
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
 * Hook to poll generation status using three-tier hybrid architecture
 * @param options - Callbacks for completion, error, and timeout
 * @returns Polling controls and state
 * 
 * Delegates to useHybridGenerationPolling for the actual implementation
 */
export const useGenerationPolling = (options: UseGenerationPollingOptions) => {
  return useHybridGenerationPolling(options);
};
