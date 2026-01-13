import { normalizeHeaders } from "./validation.ts";
import { sanitizeErrorMessage } from "./error-sanitizer.ts";

/**
 * Safe error response handler for edge functions
 * Returns generic messages to clients for security
 * Automatically sanitizes proprietary provider names
 */
export function createSafeErrorResponse(
  error: unknown,
  context: string,
  headers: HeadersInit
): Response {
  const normalizedHeaders = normalizeHeaders(headers);
  // Note: Full error logging should be handled by EdgeLogger in the calling function
  
  // Map errors to safe client messages
  let safeMessage = 'An error occurred processing your request';
  let status = 500;

  const originalErrorMsg = error instanceof Error ? error.message : String(error);
  const errorMsg = originalErrorMsg.toLowerCase();
  
  if (errorMsg.includes('auth') || errorMsg.includes('unauthorized')) {
    safeMessage = 'Authentication failed';
    status = 401;
  } else if (errorMsg.includes('not found')) {
    safeMessage = 'Resource not found';
    status = 404;
  } else if (
    errorMsg.includes('safety system') ||
    errorMsg.includes('rejected by the safety') ||
    errorMsg.includes('content policy')
  ) {
    safeMessage = 'Request rejected by safety system';
    status = 400;
  } else if (
    errorMsg.includes('prompt too long') ||
    (errorMsg.includes('exceeds') && errorMsg.includes('character limit'))
  ) {
    // Pass through prompt length errors as-is (they're already user-friendly)
    safeMessage = originalErrorMsg;
    status = 400;
  } else if (
    errorMsg.includes('invalid') || 
    errorMsg.includes('validation') ||
    errorMsg.includes('unsupportedparameter') ||
    errorMsg.includes('unsupported use') ||
    errorMsg.includes('missing required parameter')
  ) {
    safeMessage = 'Invalid request parameters';
    status = 400;
  } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
    safeMessage = 'Rate limit exceeded';
    status = 429;
  } else if (errorMsg.includes('timeout')) {
    safeMessage = 'Request timed out';
    status = 504;
  } else if (
    errorMsg.includes('file type not supported') ||
    errorMsg.includes('unsupported file') ||
    errorMsg.includes('unsupported format') ||
    errorMsg.includes('unsupported image') ||
    errorMsg.includes('unsupported media')
  ) {
    // Extract the useful part of the error for the user
    const match = originalErrorMsg.match(/:\s*(.+)$/);
    safeMessage = match ? match[1] : 'File type not supported';
    status = 400;
  } else if (
    errorMsg.includes('task creation failed') ||
    errorMsg.includes('generation failed') ||
    errorMsg.includes('provider error')
  ) {
    // Pass through provider errors that are user-actionable
    const match = originalErrorMsg.match(/:\s*(.+)$/);
    if (match) {
      safeMessage = match[1];
    }
    status = 400;
  }
  
  // Sanitize proprietary terms before sending to client
  safeMessage = sanitizeErrorMessage(safeMessage);
  
  return new Response(
    JSON.stringify({ 
      error: safeMessage,
      code: `${context.toUpperCase().replace(/-/g, '_')}_ERROR`
    }),
    { 
      status, 
      headers: { 
        ...normalizedHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}
