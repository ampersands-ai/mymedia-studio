/**
 * Safe error response handler for edge functions
 * Returns generic messages to clients for security
 */
export function createSafeErrorResponse(
  error: unknown,
  context: string,
  headers: Record<string, string>
): Response {
  // Note: Full error logging should be handled by EdgeLogger in the calling function
  
  // Map errors to safe client messages
  let safeMessage = 'An error occurred processing your request';
  let status = 500;

  const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  if (errorMsg.includes('auth') || errorMsg.includes('unauthorized')) {
    safeMessage = 'Authentication failed';
    status = 401;
  } else if (errorMsg.includes('not found')) {
    safeMessage = 'Resource not found';
    status = 404;
  } else if (errorMsg.includes('invalid') || errorMsg.includes('validation')) {
    safeMessage = 'Invalid request parameters';
    status = 400;
  } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
    safeMessage = 'Rate limit exceeded';
    status = 429;
  } else if (errorMsg.includes('timeout')) {
    safeMessage = 'Request timed out';
    status = 504;
  }
  
  return new Response(
    JSON.stringify({ 
      error: safeMessage,
      code: `${context.toUpperCase().replace(/-/g, '_')}_ERROR`
    }),
    { 
      status, 
      headers: { 
        ...headers, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}
