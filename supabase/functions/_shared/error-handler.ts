/**
 * Safe error handler for edge functions
 * Logs full error details server-side while returning sanitized messages to clients
 */

export function createSafeErrorResponse(
  error: any,
  context: string,
  corsHeaders: Record<string, string> = {}
): Response {
  // Log full error server-side for debugging
  console.error(`[${context}] Error:`, {
    message: error?.message,
    stack: error?.stack,
    name: error?.name,
  });

  // Determine safe message and status based on error type
  let safeMessage = 'An error occurred processing your request';
  let status = 500;

  const errorMsg = error?.message?.toLowerCase() || '';

  if (errorMsg.includes('auth') || errorMsg.includes('unauthorized') || errorMsg.includes('jwt')) {
    safeMessage = 'Authentication failed';
    status = 401;
  } else if (errorMsg.includes('not found') || errorMsg.includes('does not exist')) {
    safeMessage = 'Resource not found';
    status = 404;
  } else if (errorMsg.includes('invalid') || errorMsg.includes('validation')) {
    safeMessage = 'Invalid request parameters';
    status = 400;
  } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
    safeMessage = 'Rate limit exceeded';
    status = 429;
  } else if (errorMsg.includes('insufficient') || errorMsg.includes('quota')) {
    safeMessage = 'Insufficient tokens or quota';
    status = 402;
  }

  return new Response(
    JSON.stringify({
      error: safeMessage,
      code: `${context.toUpperCase()}_ERROR`,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Verify webhook signature using constant-time comparison
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
  algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(secret + body);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const expected = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Validate webhook timestamp to prevent replay attacks
 */
export function validateWebhookTimestamp(
  timestamp: number,
  maxAgeMinutes: number = 5
): boolean {
  const now = Date.now();
  const age = now - timestamp;
  const maxAge = maxAgeMinutes * 60 * 1000;

  return age >= 0 && age <= maxAge;
}
