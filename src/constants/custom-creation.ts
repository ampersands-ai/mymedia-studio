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
export const CAPTION_GENERATION_COST = 0.1;
