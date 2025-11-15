
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('fetch-video-status', requestId);
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info('Manual fetch initiated');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { renderJobId } = await req.json();

    if (!renderJobId) {
      throw new Error('Missing renderJobId parameter');
    }

    logger.info('Fetching status for render job', { metadata: { renderJobId } });

    // Check JSON2Video API for status
    const json2videoApiKey = Deno.env.get('JSON2VIDEO_API_KEY');
    
    if (!json2videoApiKey) {
      throw new Error('JSON2VIDEO_API_KEY not configured');
    }

    const statusResponse = await fetch(
      `https://api.json2video.com/v2/movies?project=${renderJobId}`,
      {
        headers: {
          'x-api-key': json2videoApiKey
        }
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`JSON2Video API error: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    logger.debug('JSON2Video response received', { metadata: { statusData } });

    // Find the storyboard
    const { data: storyboard, error: fetchError } = await supabaseClient
      .from('storyboards')
      .select('*')
      .eq('render_job_id', renderJobId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !storyboard) {
      throw new Error('Storyboard not found or unauthorized');
    }

    // Update based on status
    if (statusData.movie?.status === 'done' || statusData.movie?.status === 'success') {
      const { error: updateError } = await supabaseClient
        .from('storyboards')
        .update({
          status: 'complete',
          video_url: statusData.movie.url,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          api_quota_remaining: statusData.remaining_quota?.time || null
        })
        .eq('id', storyboard.id);

      if (updateError) {
        throw updateError;
      }

      logger.info('Video fetched successfully', { 
        metadata: { 
          videoUrl: statusData.movie.url,
          apiQuotaRemaining: statusData.remaining_quota?.time 
        }
      });
      
      // Invoke download function to store in Supabase Storage
      logger.info('Triggering video download to Supabase Storage');
      const { error: downloadError } = await supabaseClient.functions.invoke(
        'download-storyboard-video',
        {
          body: {
            storyboardId: storyboard.id,
            videoUrl: statusData.movie.url,
            userId: user.id
          }
        }
      );
      
      if (downloadError) {
        logger.error('Failed to trigger download', new Error(downloadError.message || 'Download function invocation failed'));
      } else {
        logger.info('Download function invoked successfully');
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: 'complete',
          videoUrl: statusData.movie.url,
          storyboardId: storyboard.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (statusData.movie?.status === 'error' || statusData.movie?.status === 'failed') {
      // Mark as failed and refund
      const tokenCost = storyboard.estimated_render_cost || 0;
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: tokenCost
      });

      await supabaseClient
        .from('storyboards')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
          api_quota_remaining: statusData.remaining_quota?.time || null
        })
        .eq('id', storyboard.id);

      logger.error('Video rendering failed', new Error('Rendering failed'));

      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          error: statusData.movie?.message || statusData.movie?.error || 'Rendering failed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Still processing
      logger.debug('Video still processing', { metadata: { status: statusData.movie?.status } });

      return new Response(
        JSON.stringify({
          success: false,
          status: statusData.movie?.status || 'processing',
          progress: statusData.movie?.progress || 50,
          message: 'Video is still being processed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    logger.error('Fetch video status error', error as Error);
    logger.logDuration('Fetch video status', startTime);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
