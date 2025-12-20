import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { sanitizeProprietaryTerms } from './errorSanitizer';

// User-friendly fallback message for technical errors
const USER_FRIENDLY_ERROR = 'Check parameters or refresh browser to clear cache';

// Technical error patterns that should be hidden from end users
const TECHNICAL_ERROR_PATTERNS = [
  'Edge Function returned a non-2xx status code',
  'Edge function returned an error',
  'Edge function failed',
  'non-2xx',
  'status code',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'fetch failed',
  'network error',
  'internal server error',
  'FunctionsHttpError',
  'FunctionsRelayError',
  'FunctionsFetchError',
  '500',
  '502',
  '503',
  '504',
];

/**
 * Check if an error message is technical and should be hidden from users
 */
function isTechnicalError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return TECHNICAL_ERROR_PATTERNS.some(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  );
}

/**
 * Sanitize error message for end users - hide technical details
 * and strip proprietary provider names
 */
function sanitizeErrorForUser(message: string): string {
  // If it's a technical error, return friendly message
  if (isTechnicalError(message)) {
    return USER_FRIENDLY_ERROR;
  }
  
  // Sanitize proprietary terms before returning
  return sanitizeProprietaryTerms(message);
}

/**
 * Extract meaningful error message from Supabase edge function errors.
 * 
 * When edge functions return non-2xx status codes, the actual error message
 * is in the response body, not in error.message. This utility extracts it.
 * Technical errors are sanitized to show user-friendly messages.
 * 
 * @param error - The error from supabase.functions.invoke()
 * @returns Human-readable error message (sanitized for end users)
 */
export async function extractEdgeFunctionError(error: unknown): Promise<string> {
  if (!error) return USER_FRIENDLY_ERROR;

  // FunctionsHttpError: Edge function returned non-2xx status
  // The actual error message is in the response body
  if (error instanceof FunctionsHttpError) {
    try {
      const errorBody = await error.context.json();
      // Edge functions typically return { error: "message" } or { error: { message: "..." } }
      if (errorBody?.error) {
        if (typeof errorBody.error === 'string') {
          return sanitizeErrorForUser(errorBody.error);
        }
        if (typeof errorBody.error === 'object' && errorBody.error.message) {
          return sanitizeErrorForUser(errorBody.error.message);
        }
      }
      // Fallback to message field
      if (errorBody?.message) {
        return sanitizeErrorForUser(errorBody.message);
      }
      // Can't extract meaningful error - use friendly message
      return USER_FRIENDLY_ERROR;
    } catch {
      // If we can't parse JSON, use friendly message
      return USER_FRIENDLY_ERROR;
    }
  }

  // FunctionsRelayError: Network/infrastructure error - hide technical details
  if (error instanceof FunctionsRelayError) {
    return USER_FRIENDLY_ERROR;
  }

  // FunctionsFetchError: Fetch failed entirely - hide technical details
  if (error instanceof FunctionsFetchError) {
    return USER_FRIENDLY_ERROR;
  }

  // Standard Error - sanitize the message
  if (error instanceof Error) {
    return sanitizeErrorForUser(error.message);
  }

  // Unknown error type
  return USER_FRIENDLY_ERROR;
}

/**
 * Handle edge function error with proper message extraction.
 * Throws an Error with the actual error message from the edge function.
 * 
 * @param funcError - The error from supabase.functions.invoke()
 * @throws Error with meaningful message
 */
export async function handleEdgeFunctionError(funcError: unknown): Promise<never> {
  const message = await extractEdgeFunctionError(funcError);
  throw new Error(message);
}
