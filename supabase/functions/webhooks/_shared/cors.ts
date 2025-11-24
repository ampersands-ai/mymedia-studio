/**
 * CORS Configuration for Webhooks
 * Provides consistent CORS headers for all webhook endpoints
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

/**
 * Get response headers with CORS
 */
export function getResponseHeaders(req: Request): HeadersInit {
  return {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };
}
