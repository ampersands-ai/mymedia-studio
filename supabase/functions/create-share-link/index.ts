import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('create-share-link', requestId);
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.warn('Missing authorization header');
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.warn('Unauthorized request');
      throw new Error('Unauthorized');
    }

    const { generation_id, video_job_id, storyboard_id, content_type, storage_path, bucket_name } = await req.json();
    
    logger.info('Creating share link', { 
      metadata: { userId: user.id, generation_id, video_job_id, storyboard_id, content_type } 
    });

    if (!storage_path || !content_type) {
      throw new Error('Missing required fields: storage_path, content_type');
    }

    if (!generation_id && !video_job_id && !storyboard_id) {
      throw new Error('Must provide either generation_id, video_job_id, or storyboard_id');
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
        storyboard_id: storyboard_id || null,
        user_id: user.id,
        content_type,
        storage_path,
        bucket_name: bucket_name || 'generated-content',
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    const appUrl = Deno.env.get('VITE_SUPABASE_URL')?.includes('localhost') 
      ? 'http://localhost:5173'
      : 'https://artifio.ai';
    const shareUrl = `${appUrl}/share/${token}`;

    logger.info('Share link created successfully', { metadata: { token, shareUrl } });
    logger.logDuration('Share link creation', startTime);

    return new Response(
      JSON.stringify({
        success: true,
        share_url: shareUrl,
        token,
        expires_at: shareToken.expires_at
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Failed to create share link', error as Error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
