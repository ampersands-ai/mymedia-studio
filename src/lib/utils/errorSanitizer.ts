/**
 * Centralized Error Message Sanitizer
 *
 * Strips proprietary provider names from error messages
 * to prevent internal implementation details from reaching users.
 * 
 * This provides defense-in-depth protection at the frontend layer.
 */

/**
 * Proprietary terms to sanitize (case-insensitive patterns)
 * Order matters: more specific patterns should come first
 */
const PROPRIETARY_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bkie\.ai\b/gi, replacement: 'provider' },
  { pattern: /\bkie ai\b/gi, replacement: 'provider' },
  { pattern: /\bkie_ai\b/gi, replacement: 'provider' },
  { pattern: /\bKIE\b/g, replacement: 'Provider' }, // Preserve case for acronyms
  { pattern: /\bkie\b/gi, replacement: 'provider' },
];

/**
 * Sanitize proprietary terms from a message string
 * 
 * @param message - The message to sanitize
 * @returns Message with proprietary terms replaced
 * 
 * @example
 * ```typescript
 * sanitizeProprietaryTerms('Kie.ai API failed') // 'provider API failed'
 * sanitizeProprietaryTerms('KIE task error') // 'Provider task error'
 * ```
 */
export function sanitizeProprietaryTerms(message: string): string {
  if (!message || typeof message !== 'string') {
    return message;
  }

  let sanitized = message;
  for (const { pattern, replacement } of PROPRIETARY_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}

/**
 * Sanitize error object recursively
 * Handles Error instances, objects with message properties, and arrays
 * 
 * @param error - The error to sanitize
 * @returns Sanitized error (same type as input where possible)
 */
export function sanitizeError(error: unknown): unknown {
  if (error === null || error === undefined) {
    return error;
  }

  // String: sanitize directly
  if (typeof error === 'string') {
    return sanitizeProprietaryTerms(error);
  }

  // Error instance: create new Error with sanitized message
  if (error instanceof Error) {
    const sanitizedMessage = sanitizeProprietaryTerms(error.message);
    const sanitizedError = new Error(sanitizedMessage);
    sanitizedError.name = error.name;
    sanitizedError.stack = error.stack;
    return sanitizedError;
  }

  // Array: recursively sanitize each element
  if (Array.isArray(error)) {
    return error.map(sanitizeError);
  }

  // Object: recursively sanitize relevant properties
  if (typeof error === 'object') {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(error)) {
      // Sanitize message-like properties
      if (['message', 'error', 'errorMessage', 'msg', 'details'].includes(key)) {
        sanitized[key] = sanitizeError(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  // Other types: return as-is
  return error;
}

/**
 * Check if a string contains any proprietary terms
 * 
 * @param message - The message to check
 * @returns True if proprietary terms are found
 */
export function containsProprietaryTerms(message: string): boolean {
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  return PROPRIETARY_PATTERNS.some(({ pattern }) => pattern.test(message));
}
