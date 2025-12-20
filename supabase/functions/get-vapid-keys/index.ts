import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

/**
 * Get VAPID Public Key for Web Push Notifications
 * Generates keys if they don't exist yet
 */

// Web Crypto API for VAPID key generation
async function generateVAPIDKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  // Convert to base64url encoding
  const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const privateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { publicKey, privateKey };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const logger = new EdgeLogger('get-vapid-keys', requestId, supabase, true);
    logger.info('Fetching VAPID public key');

    // Try to get existing active keys
    const { data: existingKeys, error: fetchError } = await supabase
      .from('vapid_keys')
      .select('public_key')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingKeys) {
      logger.info('Returning existing VAPID public key');
      return new Response(
        JSON.stringify({ publicKey: existingKeys.public_key }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new keys if none exist
    logger.info('Generating new VAPID keys');
    const { publicKey, privateKey } = await generateVAPIDKeys();

    // Store the keys
    const { error: insertError } = await supabase
      .from('vapid_keys')
      .insert({
        public_key: publicKey,
        private_key: privateKey,
        is_active: true
      });

    if (insertError) {
      throw insertError;
    }

    logger.info('VAPID keys generated and stored');

    return new Response(
      JSON.stringify({ publicKey }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const logger = new EdgeLogger('get-vapid-keys', requestId, supabase, true);
    logger.error('Error fetching/generating VAPID keys', error as Error);

    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
