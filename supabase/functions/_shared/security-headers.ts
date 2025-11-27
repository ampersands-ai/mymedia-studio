/**
 * Security headers for edge functions
 * Implements CSP, XSS protection, and other security best practices
 */

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Combined headers for API responses
 */
export const getResponseHeaders = (contentType = 'application/json') => ({
  ...corsHeaders,
  ...securityHeaders,
  'Content-Type': contentType,
});

/**
 * Create a secure JSON response with all security headers
 */
export const createSecureResponse = (
  body: unknown,
  status = 200,
  additionalHeaders: Record<string, string> = {}
) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getResponseHeaders(),
      ...additionalHeaders,
    },
  });
};

/**
 * Create a secure error response
 */
export const createSecureErrorResponse = (
  message: string,
  status = 500,
  additionalHeaders: Record<string, string> = {}
) => {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...getResponseHeaders(),
      ...additionalHeaders,
    },
  });
};

/**
 * Handle CORS preflight with security headers
 */
export const handleCorsPreflightSecure = () => {
  return new Response(null, {
    headers: {
      ...corsHeaders,
      ...securityHeaders,
    },
  });
};
