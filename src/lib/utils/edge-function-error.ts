import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

/**
 * Extract meaningful error message from Supabase edge function errors.
 * 
 * When edge functions return non-2xx status codes, the actual error message
 * is in the response body, not in error.message. This utility extracts it.
 * 
 * @param error - The error from supabase.functions.invoke()
 * @returns Human-readable error message
 */
export async function extractEdgeFunctionError(error: unknown): Promise<string> {
  if (!error) return 'Unknown error';

  // FunctionsHttpError: Edge function returned non-2xx status
  // The actual error message is in the response body
  if (error instanceof FunctionsHttpError) {
    try {
      const errorBody = await error.context.json();
      // Edge functions typically return { error: "message" } or { error: { message: "..." } }
      if (errorBody?.error) {
        if (typeof errorBody.error === 'string') {
          return errorBody.error;
        }
        if (typeof errorBody.error === 'object' && errorBody.error.message) {
          return errorBody.error.message;
        }
      }
      // Fallback to message field
      if (errorBody?.message) {
        return errorBody.message;
      }
      // Last resort: stringify the body
      return JSON.stringify(errorBody);
    } catch {
      // If we can't parse JSON, use the generic message
      return error.message || 'Edge function returned an error';
    }
  }

  // FunctionsRelayError: Network/infrastructure error
  if (error instanceof FunctionsRelayError) {
    return `Network error: ${error.message}`;
  }

  // FunctionsFetchError: Fetch failed entirely
  if (error instanceof FunctionsFetchError) {
    return `Connection failed: ${error.message}`;
  }

  // Standard Error
  if (error instanceof Error) {
    return error.message;
  }

  // Unknown error type
  return String(error);
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
