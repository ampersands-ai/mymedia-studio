/**
 * CORS Configuration
 *
 * SECURITY: Properly configured CORS headers to prevent CSRF attacks
 *
 * DO NOT use wildcard '*' for Access-Control-Allow-Origin in production
 * as it allows any website to make requests to your API with user credentials.
 */

/**
 * Get the allowed origin based on environment
 * Supports multiple origins for development/staging/production
 */
export function getAllowedOrigin(requestOrigin: string | null): string {
  // Get allowed origins from environment variable (comma-separated)
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');

  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map(origin => origin.trim())
    : [
        'https://yourappurl.com', // Production URL
        'http://localhost:5173',   // Local development
        'http://localhost:3000',   // Alternative local port
      ];

  // If request origin is in allowed list, return it
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Default to first allowed origin
  return allowedOrigins[0];
}

/**
 * Get CORS headers for edge functions
 * Dynamically sets the origin based on the request
 */
export function getCorsHeaders(req: Request): HeadersInit {
  const requestOrigin = req.headers.get('Origin');
  const allowedOrigin = getAllowedOrigin(requestOrigin);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '3600',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Get security headers to include in all responses
 */
export function getSecurityHeaders(): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

/**
 * Get complete headers combining CORS and security headers
 */
export function getResponseHeaders(req: Request): HeadersInit {
  return {
    ...getCorsHeaders(req),
    ...getSecurityHeaders(),
  };
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreflight(req: Request): Response {
  const requestOrigin = req.headers.get('Origin');
  const allowedOrigin = getAllowedOrigin(requestOrigin);

  // Verify origin is allowed
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map(origin => origin.trim())
    : [
        'https://yourappurl.com',
        'http://localhost:5173',
        'http://localhost:3000',
      ];

  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    // Return 403 for disallowed origins
    return new Response('Forbidden', { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
