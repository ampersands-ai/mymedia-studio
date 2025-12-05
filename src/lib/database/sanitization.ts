/**
 * Sanitization utilities for database storage
 * 
 * Prevents storing sensitive/large data in JSONB columns.
 * Images are uploaded separately to storage, so storing base64
 * in the settings column is redundant and violates size constraints.
 * 
 * @module sanitization
 */

/**
 * Recursively sanitize parameters to remove base64 image data.
 * 
 * Images are uploaded separately via uploadImagesToStorage(),
 * so storing them in the settings JSONB column is:
 * 1. Redundant (data exists in storage)
 * 2. Violates the ~50KB practical size constraint for JSONB
 * 3. Increases database storage costs unnecessarily
 * 
 * @param params - Model parameters that may contain base64 image data
 * @returns Sanitized parameters with base64 replaced by placeholder
 */
export function sanitizeForStorage(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      // Replace base64 image with placeholder - actual image is in storage
      sanitized[key] = '[IMAGE_UPLOADED_TO_STORAGE]';
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (typeof item === 'string' && item.startsWith('data:image/')) {
          return '[IMAGE_UPLOADED_TO_STORAGE]';
        }
        if (typeof item === 'object' && item !== null) {
          return sanitizeForStorage(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForStorage(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
