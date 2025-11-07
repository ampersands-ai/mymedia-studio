/**
 * Polling configuration constants
 */
export const POLLING_CONFIG = {
  IMMEDIATE_CHECK: 1000,         // 1 second
  INITIAL_INTERVAL: 3000,        // 3 seconds - reduced from 5s
  FAST_INTERVAL: 5000,           // 5 seconds - aggressive early polling
  MEDIUM_INTERVAL: 10000,        // 10 seconds
  SLOW_INTERVAL: 20000,          // 20 seconds
  FAST_THRESHOLD: 2 * 60 * 1000, // 2 minutes
  SLOW_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  MAX_DURATION: 20 * 60 * 1000,  // 20 minutes
} as const;

/**
 * Image upload configuration
 */
export const IMAGE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  VALID_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  SIGNED_URL_EXPIRY: 3600, // 1 hour
} as const;

/**
 * Caption generation token cost
 */
export const CAPTION_GENERATION_COST = 1;
