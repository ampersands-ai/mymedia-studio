/**
 * Output Processor Constants
 * Centralized configuration for timeouts, polling intervals, and retry limits
 */

// Polling configuration
export const POLLING_INTERVAL_MS = 2000;
export const POLLING_MAX_ATTEMPTS = 150; // 5 minutes at 2s intervals

// Realtime configuration
export const REALTIME_CONNECT_TIMEOUT_MS = 5000;
export const REALTIME_FALLBACK_DELAY_MS = 5000;

// Stall detection
export const STALL_DETECTION_TIMEOUT_MS = 20000;

// Database retry configuration
export const DB_RETRY_DELAY_MS = 500;
export const DB_MAX_RETRIES = 3;

// Child generation fetch delay (wait for DB commit)
export const CHILD_FETCH_DELAY_MS = 500;
export const CHILD_RETRY_DELAY_MS = 1000;

// Terminal statuses
export const TERMINAL_STATUSES = ['completed', 'failed', 'error'] as const;
export type TerminalStatus = typeof TERMINAL_STATUSES[number];

// Realtime channel name prefix
export const REALTIME_CHANNEL_PREFIX = 'output-processor';
