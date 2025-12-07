/**
 * Output Processor Constants
 * Simplified configuration for direct database polling
 */

// Polling configuration
export const POLLING_INTERVAL_MS = 2000; // 2 seconds between polls
export const POLLING_MAX_ATTEMPTS = 45; // 90 seconds max (45 * 2s)

// Terminal statuses
export const TERMINAL_STATUSES = ['completed', 'failed', 'error'] as const;
export type TerminalStatus = typeof TERMINAL_STATUSES[number];
