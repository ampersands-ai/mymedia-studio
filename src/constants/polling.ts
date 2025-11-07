/**
 * Unified polling configuration constants
 * Used across generation and custom creation polling hooks
 */

/**
 * Standard polling intervals and timeouts
 */
export const POLLING_INTERVALS = {
  // Initial delay before first poll
  INITIAL: 5000,              // 5 seconds
  
  // Fast polling (early stage)
  FAST: 10000,                // 10 seconds
  
  // Medium polling (mid stage)
  MEDIUM: 15000,              // 15 seconds
  
  // Slow polling (late stage)
  SLOW: 30000,                // 30 seconds
} as const;

/**
 * Polling stage thresholds
 */
export const POLLING_THRESHOLDS = {
  // Switch from FAST to MEDIUM after 1 minute
  FAST_DURATION: 60 * 1000,   // 1 minute
  
  // Switch from MEDIUM to SLOW after 2 minutes
  MEDIUM_DURATION: 2 * 60 * 1000, // 2 minutes
  
  // Switch from FAST to SLOW after 5 minutes (alternative strategy)
  FAST_TO_SLOW: 5 * 60 * 1000, // 5 minutes
  
  // Maximum polling duration before timeout
  MAX_DURATION: 20 * 60 * 1000, // 20 minutes
} as const;

/**
 * Polling strategy types
 */
export type PollingStrategy = 'progressive' | 'dynamic' | 'fixed';

/**
 * Get polling interval based on elapsed time
 * @param elapsedMs - Time elapsed since polling started
 * @param strategy - Polling strategy to use
 */
export const getPollingInterval = (
  elapsedMs: number,
  strategy: PollingStrategy = 'progressive'
): number => {
  switch (strategy) {
    case 'progressive':
      // Progressive: FAST → MEDIUM → SLOW
      if (elapsedMs < POLLING_THRESHOLDS.FAST_DURATION) {
        return POLLING_INTERVALS.FAST;
      } else if (elapsedMs < POLLING_THRESHOLDS.MEDIUM_DURATION) {
        return POLLING_INTERVALS.MEDIUM;
      } else {
        return POLLING_INTERVALS.SLOW;
      }
    
    case 'dynamic':
      // Dynamic: FAST → SLOW (skip medium)
      if (elapsedMs < POLLING_THRESHOLDS.FAST_TO_SLOW) {
        return POLLING_INTERVALS.INITIAL;
      } else {
        return POLLING_INTERVALS.SLOW;
      }
    
    case 'fixed':
      // Fixed: Always use MEDIUM interval
      return POLLING_INTERVALS.MEDIUM;
    
    default:
      return POLLING_INTERVALS.MEDIUM;
  }
};

/**
 * Check if polling should timeout
 * @param elapsedMs - Time elapsed since polling started
 */
export const shouldTimeout = (elapsedMs: number): boolean => {
  return elapsedMs >= POLLING_THRESHOLDS.MAX_DURATION;
};
