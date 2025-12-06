/**
 * CORS Configuration
 *
 * SECURITY: Properly configured CORS headers to prevent CSRF attacks
 *
 * DO NOT use wildcard '*' for Access-Control-Allow-Origin in production
 * as it allows any website to make requests to your API with user credentials.
 */

// Lovable domain patterns for preview and production URLs
const LOVABLE_PATTERNS = [
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovableproject\.com$/,
];

/**
 * Check if origin matches Lovable domain patterns or localhost
 */
function isAllowedOrigin(origin: string): boolean {
  // Check Lovable patterns
  for (const pattern of LOVABLE_PATTERNS) {
    if (pattern.test(origin)) {
      return true;
    }
  }
  // Allow localhost for development
  if (origin.startsWith('http://localhost:')) {
    return true;
  }
  return false;
}

/**
 * Get the allowed origin based on environment
 * Supports multiple origins for development/staging/production
 */
export function getAllowedOrigin(requestOrigin: string | null): string {
  // Get allowed origins from environment variable (comma-separated)
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');

  // If environment variable is set, use explicit list
  if (allowedOriginsEnv) {
    const allowedOrigins = allowedOriginsEnv.split(',').map(origin => origin.trim());
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    return allowedOrigins[0];
  }

  // Use pattern matching for Lovable domains
  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    return requestOrigin;
  }

  // Return the request origin if provided (for flexibility), otherwise use wildcard
  return requestOrigin || '*';
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

  // Verify origin is allowed using pattern matching or explicit list
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');
  
  if (requestOrigin) {
    if (allowedOriginsEnv) {
      // Use explicit list from environment
      const allowedOrigins = allowedOriginsEnv.split(',').map(origin => origin.trim());
      if (!allowedOrigins.includes(requestOrigin)) {
        return new Response('Forbidden', { status: 403 });
      }
    } else {
      // Use pattern matching for Lovable domains
      if (!isAllowedOrigin(requestOrigin)) {
        return new Response('Forbidden', { status: 403 });
      }
    }
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
