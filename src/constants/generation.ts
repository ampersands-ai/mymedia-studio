/**
 * Generation constants for polling, toasts, and downloads
 */

export const POLLING_CONFIG = {
  INITIAL_DELAY: 5000,           // 5 seconds - first check
  SHORT_INTERVAL: 10000,         // 10 seconds - for first minute
  SHORT_INTERVAL_DURATION: 60000, // 1 minute
  LONG_INTERVAL: 30000,          // 30 seconds - after first minute
  MAX_DURATION: 20 * 60 * 1000,  // 20 minutes
} as const;

export const TOAST_IDS = {
  GENERATION_PROGRESS: 'generation-progress',
  DOWNLOAD: 'download-toast',
} as const;

export const DOWNLOAD_CONFIG = {
  BATCH_DELAY: 500,              // 500ms between batch downloads
  SIGNED_URL_EXPIRY: 60,         // 60 seconds
} as const;
