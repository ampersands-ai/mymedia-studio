import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('get-shared-content', requestId);
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      logger.warn('Missing token parameter');
      throw new Error('Missing token parameter');
    }
    
    logger.info('Fetching shared content', { metadata: { token } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch share token
    const { data: shareToken, error: tokenError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !shareToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired share link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (new Date(shareToken.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This share link has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update view count
    await supabase
      .from('share_tokens')
      .update({ 
        view_count: shareToken.view_count + 1,
        last_viewed_at: new Date().toISOString()
      })
      .eq('id', shareToken.id);

    // Generate temporary signed URL (1 hour)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(shareToken.bucket_name)
      .createSignedUrl(shareToken.storage_path, 3600); // 1 hour

    if (signedError || !signedData) {
      logger.error('Failed to generate signed URL', signedError || new Error('No signed data'));
      throw new Error('Failed to generate signed URL');
    }

    logger.info('Shared content retrieved successfully');
    logger.logDuration('Content retrieval', startTime);

    return new Response(
      JSON.stringify({ 
        success: true,
        signed_url: signedData.signedUrl,
        content_type: shareToken.content_type,
        expires_in: 3600 // seconds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Failed to fetch shared content', error as Error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
