import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { storyboardId, videoUrl, userId } = await req.json();

    if (!storyboardId || !videoUrl || !userId) {
      throw new Error('Missing required parameters: storyboardId, videoUrl, userId');
    }

    console.log('[download-storyboard-video] Starting download for storyboard:', storyboardId);

    // Fetch storyboard details
    const { data: storyboard, error: storyboardError } = await supabaseClient
      .from('storyboards')
      .select('*')
      .eq('id', storyboardId)
      .eq('user_id', userId)
      .single();

    if (storyboardError || !storyboard) {
      throw new Error('Storyboard not found or unauthorized');
    }

    // Download video from JSON2Video with timeout
    console.log('[download-storyboard-video] Downloading from:', videoUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    let videoResponse;
    try {
      videoResponse = await fetch(videoUrl, {
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const error = fetchError as Error;
      if (error.name === 'AbortError') {
        throw new Error('Video download timeout after 60 seconds');
      }
      throw new Error(`Failed to download video: ${error.message}`);
    }
    clearTimeout(timeoutId);

    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.arrayBuffer();
    const videoSize = videoBlob.byteLength;

    console.log('[download-storyboard-video] Downloaded video size:', videoSize, 'bytes');

    // Generate storage path: storyboard-videos/{user_id}/{YYYY-MM-DD}/{storyboard_id}.mp4
    const now = new Date();
    const dateFolder = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const storagePath = `storyboard-videos/${userId}/${dateFolder}/${storyboardId}.mp4`;

    // Upload to Supabase Storage
    console.log('[download-storyboard-video] Uploading to storage:', storagePath);
    
    const { error: uploadError } = await supabaseClient
      .storage
      .from('generated-content')
      .upload(storagePath, videoBlob, {
        contentType: 'video/mp4',
        upsert: true, // Allow re-upload if needed
      });

    if (uploadError) {
      console.error('[download-storyboard-video] Storage upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('[download-storyboard-video] Successfully uploaded to storage');

    // Update storyboards table with storage path
    const { error: updateError } = await supabaseClient
      .from('storyboards')
      .update({
        video_storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyboardId);

    if (updateError) {
      console.error('[download-storyboard-video] Failed to update storyboard:', updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // Create generations record
    console.log('[download-storyboard-video] Creating generations record');
    
    const { error: generationError } = await supabaseClient
      .from('generations')
      .insert({
        user_id: userId,
        type: 'video',
        prompt: `Storyboard: ${storyboard.topic}`,
        status: 'completed',
        tokens_used: storyboard.estimated_render_cost || 0,
        storage_path: storagePath,
        model_id: 'storyboard-video-generator',
        settings: {
          storyboard_id: storyboardId,
          topic: storyboard.topic,
          duration: storyboard.duration,
          voice_id: storyboard.voice_id,
          video_style: storyboard.video_style,
        },
      });

    if (generationError) {
      console.warn('[download-storyboard-video] Failed to create generation record:', generationError);
      // Don't throw - video is still saved successfully
    }

    console.log('[download-storyboard-video] Successfully completed for storyboard:', storyboardId);

    return new Response(
      JSON.stringify({
        success: true,
        storagePath,
        fileSize: videoSize,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[download-storyboard-video] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
