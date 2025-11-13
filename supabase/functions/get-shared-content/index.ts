
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      throw new Error('Missing token parameter');
    }

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
      throw new Error('Failed to generate signed URL');
    }

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
    console.error('Error fetching shared content:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
