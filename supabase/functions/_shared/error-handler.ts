/**
 * Safe error response handler for edge functions
 * Logs full errors server-side while returning generic messages to clients
 */
export function createSafeErrorResponse(
  error: any,
  context: string,
  headers: Record<string, string>
): Response {
  // Log full error server-side for debugging
  console.error(`[${context}] Error:`, {
    message: error?.message,
    stack: error?.stack,
    details: error
  });
  
  // Map errors to safe client messages
  let safeMessage = 'An error occurred processing your request';
  let status = 500;
  
  const errorMsg = error?.message?.toLowerCase() || '';
  
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
