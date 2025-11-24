
/**
 * DEPRECATED EDGE FUNCTION
 *
 * This endpoint has been deprecated as part of the security refactoring.
 * All models now use the 'generate-content' edge function which handles
 * API keys server-side, eliminating client-side API key exposure.
 *
 * Related commits:
 * - 65648b95: Security refactor for 54 KIE.AI models
 * - 5d1483bc: Security refactor for 13 Runware models
 *
 * HTTP 410 Gone indicates this resource is permanently unavailable.
 */

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  console.warn('DEPRECATED: get-api-key function called. All models should use generate-content edge function instead.');

  return new Response(
    JSON.stringify({
      error: 'This endpoint is deprecated',
      message: 'API key retrieval has been deprecated. All models now use the generate-content edge function for secure server-side API key management.',
      status: 'gone',
      migration_guide: 'Use supabase.functions.invoke("generate-content") instead'
    }),
    {
      status: 410,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' }
    }
  );
});
