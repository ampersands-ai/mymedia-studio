/**
 * Output Processor Constants
 * Progressive polling configuration for video generations
 */

// Polling intervals
export const POLLING_INTERVAL_FAST_MS = 2000;   // 2 seconds (first 3 minutes)
export const POLLING_INTERVAL_SLOW_MS = 7000;   // 7 seconds (after 3 minutes)

// Time thresholds
export const FAST_POLLING_DURATION_MS = 3 * 60 * 1000;  // 3 minutes in ms
export const MAX_POLLING_DURATION_MS = 30 * 60 * 1000;  // 30 minutes in ms

// Terminal statuses
export const TERMINAL_STATUSES = ['completed', 'failed', 'error'] as const;
export type TerminalStatus = typeof TERMINAL_STATUSES[number];
