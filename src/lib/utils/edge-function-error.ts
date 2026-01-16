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
 * Rate limit error data extracted from edge function response
 */
export interface RateLimitErrorData {
  isRateLimited: true;
  message: string;
  retryAfter: number;
  retryAfterMs?: number;
  resetAt?: string;
  countdown?: {
    seconds: number;
    displayText: string;
    resetAtTimestamp?: number;
  };
}

export interface ExtractedError {
  message: string;
  isRateLimited: false;
}

export type EdgeFunctionErrorResult = RateLimitErrorData | ExtractedError;

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
 * Also detects and returns structured rate limit data for countdown UI.
 * 
 * When edge functions return non-2xx status codes, the actual error message
 * is in the response body, not in error.message. This utility extracts it.
 * Technical errors are sanitized to show user-friendly messages.
 * 
 * @param error - The error from supabase.functions.invoke()
 * @returns Error result with message and optional rate limit data
 */
export async function extractEdgeFunctionErrorWithDetails(error: unknown): Promise<EdgeFunctionErrorResult> {
  if (!error) return { message: USER_FRIENDLY_ERROR, isRateLimited: false };

  // FunctionsHttpError: Edge function returned non-2xx status
  // The actual error message is in the response body
  if (error instanceof FunctionsHttpError) {
    try {
      const errorBody = await error.context.json();
      
      // Check if this is a rate limit error (429)
      if (errorBody?.error === 'Rate limit exceeded' || errorBody?.countdown) {
        return {
          isRateLimited: true,
          message: errorBody.message || 'Rate limit exceeded. Please try again later.',
          retryAfter: errorBody.retryAfter || 60,
          retryAfterMs: errorBody.retryAfterMs,
          resetAt: errorBody.resetAt,
          countdown: errorBody.countdown,
        };
      }
      
      // Edge functions typically return { error: "message" } or { error: { message: "..." } }
      let baseMessage = '';
      
      if (errorBody?.error) {
        if (typeof errorBody.error === 'string') {
          baseMessage = errorBody.error;
        } else if (typeof errorBody.error === 'object' && errorBody.error.message) {
          baseMessage = errorBody.error.message;
        }
      } else if (errorBody?.message) {
        baseMessage = errorBody.message;
      }
      
      if (!baseMessage) {
        return { message: USER_FRIENDLY_ERROR, isRateLimited: false };
      }
      
      // Enhance rate limit messages with timing info
      if (errorBody?.reset_in_seconds && typeof errorBody.reset_in_seconds === 'number') {
        const minutes = Math.floor(errorBody.reset_in_seconds / 60);
        const seconds = errorBody.reset_in_seconds % 60;
        const timeStr = minutes > 0 
          ? `${minutes}m ${seconds}s` 
          : `${seconds}s`;
        baseMessage = `${baseMessage}. Try again in ${timeStr}`;
      } else if (errorBody?.limit !== undefined && errorBody?.current !== undefined) {
        // Include limit info if available
        baseMessage = `${baseMessage} (${errorBody.current}/${errorBody.limit})`;
      }
      
      return { message: sanitizeErrorForUser(baseMessage), isRateLimited: false };
    } catch {
      // If we can't parse JSON, use friendly message
      return { message: USER_FRIENDLY_ERROR, isRateLimited: false };
    }
  }

  // FunctionsRelayError: Network/infrastructure error - hide technical details
  if (error instanceof FunctionsRelayError) {
    return { message: USER_FRIENDLY_ERROR, isRateLimited: false };
  }

  // FunctionsFetchError: Fetch failed entirely - hide technical details
  if (error instanceof FunctionsFetchError) {
    return { message: USER_FRIENDLY_ERROR, isRateLimited: false };
  }

  // Standard Error - sanitize the message
  if (error instanceof Error) {
    // Check for rate limit in error message
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      return {
        isRateLimited: true,
        message: error.message,
        retryAfter: 60, // Default to 60 seconds if not specified
      };
    }
    return { message: sanitizeErrorForUser(error.message), isRateLimited: false };
  }

  // Unknown error type
  return { message: USER_FRIENDLY_ERROR, isRateLimited: false };
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
  const result = await extractEdgeFunctionErrorWithDetails(error);
  return result.message;
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

/**
 * Check if an error result indicates rate limiting
 */
export function isRateLimitResult(result: EdgeFunctionErrorResult): result is RateLimitErrorData {
  return result.isRateLimited === true;
}
