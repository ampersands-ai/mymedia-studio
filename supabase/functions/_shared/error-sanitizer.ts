/**
 * Backend Error Message Sanitizer
 *
 * Strips proprietary provider names from error messages
 * before they're sent to clients.
 * 
 * This provides defense-in-depth protection at the backend layer.
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
 * sanitizeErrorMessage('Kie.ai API failed') // 'provider API failed'
 * sanitizeErrorMessage('KIE task error') // 'Provider task error'
 * ```
 */
export function sanitizeErrorMessage(message: string): string {
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
