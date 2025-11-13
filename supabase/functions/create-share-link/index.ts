
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { generation_id, video_job_id, content_type, storage_path, bucket_name } = await req.json();

    if (!storage_path || !content_type) {
      throw new Error('Missing required fields: storage_path, content_type');
    }

    if (!generation_id && !video_job_id) {
      throw new Error('Must provide either generation_id or video_job_id');
    }

    // Generate random token (21 chars, URL-safe)
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 21);

    // Insert share token
    const { data: shareToken, error: insertError } = await supabase
      .from('share_tokens')
      .insert({
        token,
        generation_id: generation_id || null,
        video_job_id: video_job_id || null,
        user_id: user.id,
        content_type,
        storage_path,
        bucket_name: bucket_name || 'generated-content',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const appUrl = Deno.env.get('VITE_SUPABASE_URL')?.includes('localhost') 
      ? 'http://localhost:5173'
      : 'https://artifio.ai';
    const shareUrl = `${appUrl}/share/${token}`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        share_url: shareUrl,
        token,
        expires_at: shareToken.expires_at 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating share link:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
