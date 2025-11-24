
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const logger = new EdgeLogger('get-api-key', crypto.randomUUID(), supabase);

  logger.warn('DEPRECATED: get-api-key function called. All models should use generate-content edge function instead.');

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
