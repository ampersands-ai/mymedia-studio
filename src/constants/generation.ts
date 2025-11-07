/**
 * Generation constants for polling, toasts, and downloads
 */

export const POLLING_CONFIG = {
  IMMEDIATE_CHECK: 1000,         // 1 second - instant check
  INITIAL_DELAY: 3000,           // 3 seconds - reduced from 5s
  FAST_INTERVAL: 5000,           // 5 seconds - aggressive early polling
  FAST_DURATION: 2 * 60 * 1000,  // 2 minutes
  MEDIUM_INTERVAL: 10000,        // 10 seconds
  MEDIUM_DURATION: 5 * 60 * 1000, // 5 minutes
  SLOW_INTERVAL: 20000,          // 20 seconds
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
