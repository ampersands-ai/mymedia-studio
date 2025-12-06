/**
 * Image Validation Utilities
 * 
 * Centralized utilities for detecting and validating image data in parameters.
 * Provides fail-safe mechanisms to prevent base64 images from being sent to APIs.
 * 
 * @module imageValidation
 */

/**
 * Check if a value contains base64 image data
 * Works recursively on nested objects and arrays
 */
export function containsBase64Image(value: unknown): boolean {
  if (typeof value === 'string') {
    // Check for data URL format (data:image/...) or raw base64 indicator
    return value.startsWith('data:image/') || 
           (value.includes(';base64,') && value.length > 1000);
  }
  
  if (Array.isArray(value)) {
    return value.some(item => containsBase64Image(item));
  }
  
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(v => containsBase64Image(v));
  }
  
  return false;
}

/**
 * Find all fields containing base64 images in an object
 * Returns array of field paths (e.g., ["image_url", "images.0"])
 */
export function findBase64Fields(
  obj: Record<string, unknown>, 
  parentPath = ''
): string[] {
  const fields: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    
    if (typeof value === 'string' && containsBase64Image(value)) {
      fields.push(currentPath);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string' && containsBase64Image(item)) {
          fields.push(`${currentPath}[${index}]`);
        } else if (typeof item === 'object' && item !== null) {
          fields.push(...findBase64Fields(item as Record<string, unknown>, `${currentPath}[${index}]`));
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      fields.push(...findBase64Fields(value as Record<string, unknown>, currentPath));
    }
  }
  
  return fields;
}

/**
 * Validate that parameters don't contain base64 images
 * @throws Error if base64 images detected with detailed field information
 */
export function assertNoBase64Images(
  params: Record<string, unknown>, 
  context: string
): void {
  const base64Fields = findBase64Fields(params);
  
  if (base64Fields.length > 0) {
    const fieldList = base64Fields.join(', ');
    throw new Error(
      `Base64 images detected in parameter(s): ${fieldList}. ` +
      `Images must be uploaded to storage first. ` +
      `Context: ${context}`
    );
  }
}

/**
 * Validation result for base64 check
 */
export interface Base64ValidationResult {
  valid: boolean;
  error?: string;
  affectedFields?: string[];
}

/**
 * Validate parameters for base64 images (non-throwing version)
 * Returns validation result object instead of throwing
 */
export function validateNoBase64Images(
  params: Record<string, unknown>,
  context?: string
): Base64ValidationResult {
  const base64Fields = findBase64Fields(params);
  
  if (base64Fields.length > 0) {
    const fieldList = base64Fields.join(', ');
    return {
      valid: false,
      error: `Base64 images detected in parameter(s): ${fieldList}. Images must be uploaded to storage first.${context ? ` Context: ${context}` : ''}`,
      affectedFields: base64Fields
    };
  }
  
  return { valid: true };
}
