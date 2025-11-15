
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = new EdgeLogger('download-storyboard-video', requestId);
  
  try {
    logger.info('Starting storyboard video download');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { storyboardId, videoUrl, userId } = await req.json();

    if (!storyboardId || !videoUrl || !userId) {
      throw new Error('Missing required parameters: storyboardId, videoUrl, userId');
    }

    logger.info('Processing download request', { metadata: { storyboardId, userId } });

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
    logger.info('Downloading video', { metadata: { videoUrl: videoUrl.substring(0, 100) } });
    
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

    logger.info('Video downloaded successfully', { metadata: { videoSize } });

    // Generate storage path: storyboard-videos/{user_id}/{YYYY-MM-DD}/{storyboard_id}.mp4
    const now = new Date();
    const dateFolder = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const storagePath = `storyboard-videos/${userId}/${dateFolder}/${storyboardId}.mp4`;

    // Upload to Supabase Storage
    logger.info('Uploading to storage', { metadata: { storagePath } });
    
    const { error: uploadError } = await supabaseClient
      .storage
      .from('generated-content')
      .upload(storagePath, videoBlob, {
        contentType: 'video/mp4',
        upsert: true, // Allow re-upload if needed
      });

    if (uploadError) {
      logger.error('Storage upload failed', uploadError instanceof Error ? uploadError : new Error(uploadError?.message || 'Upload error'));
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    logger.info('Successfully uploaded to storage', { metadata: { storagePath } });

    // Update storyboards table with storage path
    const { error: updateError } = await supabaseClient
      .from('storyboards')
      .update({
        video_storage_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyboardId);

    if (updateError) {
      logger.error('Failed to update storyboard', updateError instanceof Error ? updateError : new Error(updateError?.message || 'Database error'));
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // Create generations record
    logger.debug('Creating generations record');
    
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
      logger.warn('Failed to create generation record', generationError);
      // Don't throw - video is still saved successfully
    }

    logger.info('Download complete', { metadata: { storyboardId } });
    logger.logDuration('Video download and upload', startTime);

    return new Response(
      JSON.stringify({
        success: true,
        storagePath,
        fileSize: videoSize,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Download failed', error as Error);
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
