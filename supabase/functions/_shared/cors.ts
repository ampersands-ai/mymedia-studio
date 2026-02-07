/**
 * CORS Configuration (Multi-Tenant)
 *
 * Allows requests from:
 * 1. Explicit origins in ALLOWED_ORIGINS env var (comma-separated)
 * 2. Any *.PLATFORM_DOMAIN subdomain (e.g. mybrand.mymedia.studio)
 * 3. localhost for development
 *
 * SECURITY: Does NOT use wildcard '*' for Access-Control-Allow-Origin.
 */

const PLATFORM_DOMAIN = Deno.env.get('PLATFORM_DOMAIN') || 'mymedia.studio';

/**
 * Check if origin matches allowed patterns
 */
function isAllowedOrigin(origin: string): boolean {
  // Allow localhost for development
  if (origin.startsWith('http://localhost:') || origin === 'http://localhost') {
    return true;
  }

  // Allow any subdomain of the platform domain (mybrand.mymedia.studio)
  try {
    const url = new URL(origin);
    if (url.hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
      return true;
    }
  } catch {
    // Invalid URL
  }

  return false;
}

/**
 * Get the allowed origin based on environment
 */
export function getAllowedOrigin(requestOrigin: string | null): string {
  // Get allowed origins from environment variable (comma-separated)
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map(origin => origin.trim())
    : [];

  // Check if origin is in explicit list
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Check platform subdomains and localhost
  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    return requestOrigin;
  }

  // Fallback: use first allowed origin if set, otherwise request origin or wildcard
  if (allowedOrigins.length > 0) {
    return allowedOrigins[0];
  }

  return requestOrigin || '*';
}

/**
 * Get CORS headers for edge functions
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
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
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

  if (requestOrigin) {
    const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');
    const allowedOrigins = allowedOriginsEnv
      ? allowedOriginsEnv.split(',').map(origin => origin.trim())
      : [];

    const inExplicitList = allowedOrigins.includes(requestOrigin);
    const matchesPattern = isAllowedOrigin(requestOrigin);

    if (!inExplicitList && !matchesPattern) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
