/**
 * Sanitizes error messages for client consumption
 * Logs detailed errors server-side while returning safe messages to clients
 */

const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'Missing authorization header': 'Authentication required',
  'Invalid JWT': 'Authentication required',
  'Unauthorized': 'Authentication required',
  'JWT expired': 'Session expired. Please sign in again',
  
  // Database errors
  'Template not found or inactive': 'Invalid template selected',
  'Model not found or inactive': 'Invalid model selected',
  'Failed to fetch token balance': 'Unable to process request',
  'Insufficient tokens': 'Insufficient tokens available',
  'User not found': 'User account not found',
  'User subscription not found': 'Subscription not found',
  
  // Validation errors
  'Invalid token amount': 'Invalid amount specified',
  'Invalid input': 'Invalid request parameters',
  'Missing required field': 'Required information missing',
  
  // Rate limiting
  'Rate limit exceeded': 'Too many requests. Please try again later',
  'Concurrent limit exceeded': 'Maximum concurrent operations reached',
  
  // General errors
  'Internal server error': 'An error occurred. Please try again',
  'Service unavailable': 'Service temporarily unavailable',
};

export function sanitizeError(error: Error | unknown): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  // Check if we have a mapped safe message
  for (const [key, safeMessage] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.includes(key)) {
      return safeMessage;
    }
  }
  
  // Default safe message
  return 'An error occurred. Please try again later';
}

export function logError(context: string, error: Error | unknown, metadata?: Record<string, any>) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[${context}] Error:`, {
    message: errorMessage,
    stack,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

export function createErrorResponse(
  error: Error | unknown,
  corsHeaders: Record<string, string>,
  context: string,
  metadata?: Record<string, any>
): Response {
  logError(context, error, metadata);
  
  const statusCode = error instanceof Error && error.message.includes('Authentication required') 
    ? 401 
    : error instanceof Error && error.message.includes('Rate limit exceeded')
    ? 429
    : 500;
  
  return new Response(
    JSON.stringify({ 
      error: sanitizeError(error),
      timestamp: new Date().toISOString(),
    }),
    { 
      status: statusCode, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
