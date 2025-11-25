/**
 * Standardized CORS and security headers for all edge functions
 *
 * SECURITY: Uses dynamic origin validation to prevent CSRF attacks
 *
 * Security headers explained:
 * - X-Content-Type-Options: Prevents MIME-sniffing attacks
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-XSS-Protection: Enables browser XSS filtering
 * - Referrer-Policy: Controls referrer information
 * - Permissions-Policy: Restricts browser features
 * - Strict-Transport-Security: Enforces HTTPS (production only)
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
 * Get CORS headers with dynamic origin
 * @deprecated Use getResponseHeaders from _shared/cors.ts instead
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  return {
    // CORS configuration - SECURE: Dynamic origin validation
    'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',

    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',

    // Content type
    'Content-Type': 'application/json',
  };
}

/**
 * Legacy wildcard CORS - DEPRECATED
 * @deprecated This is insecure. Use getCorsHeaders(req.headers.get('Origin')) instead
 */
export const corsHeaders = getCorsHeaders(null);

/**
 * Security headers for production environments (includes HSTS)
 */
export const securityHeaders = {
  ...corsHeaders,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

/**
 * Get appropriate headers based on environment
 */
export function getHeaders(): Record<string, string> {
  const env = Deno.env.get('DENO_ENV') || 'development';
  return env === 'production' ? securityHeaders : corsHeaders;
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleOptionsRequest(): Response {
  return new Response(null, { 
    status: 204,
    headers: corsHeaders 
  });
}

/**
 * Create a JSON response with security headers
 */
export function createJsonResponse(
  data: unknown,
  status = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getHeaders(),
      ...additionalHeaders
    }
  });
}

/**
 * Create an error response with security headers
 */
export function createErrorResponse(
  error: string,
  status = 500,
  details?: Record<string, unknown>
): Response {
  return createJsonResponse(
    {
      error,
      message: details?.message || error,
      ...(details && { details })
    },
    status
  );
}
