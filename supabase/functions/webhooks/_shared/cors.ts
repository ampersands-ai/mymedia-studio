/**
 * CORS Configuration for Webhooks
 * Provides consistent CORS headers for all webhook endpoints
 *
 * SECURITY: Uses dynamic origin validation to prevent CSRF attacks
 */

/**
 * Get allowed origin based on environment configuration
 */
function getAllowedOrigin(requestOrigin: string | null): string {
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map(origin => origin.trim())
    : [
        'https://yourappurl.com',
        'http://localhost:5173',
        'http://localhost:3000',
      ];

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0];
}

/**
 * Get CORS headers with dynamic origin validation
 */
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '3600',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Legacy wildcard CORS - DEPRECATED
 * @deprecated This is insecure. Use getResponseHeaders(req) instead
 */
export const corsHeaders = getCorsHeaders(null);

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflight(req: Request): Response {
  const requestOrigin = req.headers.get('Origin');

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(requestOrigin)
  });
}

/**
 * Get response headers with CORS
 */
export function getResponseHeaders(req: Request): HeadersInit {
  const requestOrigin = req.headers.get('Origin');

  return {
    ...getCorsHeaders(requestOrigin),
    'Content-Type': 'application/json',
  };
}
