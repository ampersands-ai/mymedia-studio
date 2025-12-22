import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

/**
 * Save signup attribution data for acquisition analytics
 * Called after successful signup to record UTM and referral data
 */
Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const logger = new EdgeLogger('save-signup-attribution', requestId);

  try {
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to insert (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if attribution already exists for this user
    const { data: existing } = await supabaseAdmin
      .from('signup_attribution')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Attribution already recorded, skip
      logger.info('Attribution already exists', { metadata: { userId: user.id } });
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and validate input
    const attribution = {
      user_id: user.id,
      utm_source: body.utm_source?.substring(0, 100) || null,
      utm_medium: body.utm_medium?.substring(0, 100) || null,
      utm_campaign: body.utm_campaign?.substring(0, 200) || null,
      utm_term: body.utm_term?.substring(0, 200) || null,
      utm_content: body.utm_content?.substring(0, 200) || null,
      referral_code: body.referral_code?.substring(0, 50) || null,
      landing_page: body.landing_page?.substring(0, 500) || null,
      signup_method: body.signup_method?.substring(0, 20) || 'email',
      device_type: body.device_type?.substring(0, 20) || null,
    };

    // Insert attribution record
    const { error: insertError } = await supabaseAdmin
      .from('signup_attribution')
      .insert(attribution);

    if (insertError) {
      logger.error('Failed to save attribution', insertError as Error);
      // Don't fail the request - attribution is nice-to-have
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save' }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Attribution saved', { 
      metadata: { 
        userId: user.id, 
        source: attribution.utm_source,
        referral: attribution.referral_code 
      } 
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in save-signup-attribution', error as Error);
    // Return success anyway - don't block signup flow
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
