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

    // Accept storyboardId from both query params AND request body
    const url = new URL(req.url);
    let storyboardId = url.searchParams.get('storyboardId');
    
    // If not in query params, try body
    if (!storyboardId && req.method === 'POST') {
      try {
        const body = await req.json();
        storyboardId = body.storyboardId;
      } catch (e) {
        // Body parsing failed, continue with null
      }
    }

    console.log('[poll-storyboard-status] storyboardId received:', storyboardId);

    if (!storyboardId) {
      throw new Error('Missing storyboardId parameter (checked both query params and body)');
    }

    // Fetch storyboard
    const { data: storyboard, error: storyboardError } = await supabaseClient
      .from('storyboards')
      .select('*')
      .eq('id', storyboardId)
      .eq('user_id', user.id)
      .single();

    if (storyboardError || !storyboard) {
      throw new Error('Storyboard not found or unauthorized');
    }

    let status = storyboard.status;
    let progress = 0;
    let videoUrl = storyboard.video_url;

    // If already complete or failed, return cached status
    if (status === 'complete' || status === 'failed') {
      progress = status === 'complete' ? 100 : 0;
      console.log('[poll-storyboard-status] Storyboard already finalized:', status);
      
      return new Response(
        JSON.stringify({
          status,
          progress,
          videoUrl,
          renderJobId: storyboard.render_job_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check JSON2Video API for real status
    if (storyboard.render_job_id && status === 'rendering') {
      const json2videoApiKey = Deno.env.get('JSON2VIDEO_API_KEY');
      
      if (!json2videoApiKey) {
        console.warn('[poll-storyboard-status] JSON2VIDEO_API_KEY not configured, using webhook-only mode');
        // Return current status, webhook will update when ready
        return new Response(
          JSON.stringify({
            status,
            progress: 50,
            videoUrl: null,
            renderJobId: storyboard.render_job_id,
            message: 'Waiting for webhook notification'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        console.log('[poll-storyboard-status] Checking JSON2Video status for:', storyboard.render_job_id);
        
        const statusResponse = await fetch(
          `https://api.json2video.com/v2/movies?project=${storyboard.render_job_id}`,
          {
            headers: {
              'x-api-key': json2videoApiKey
            }
          }
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('[poll-storyboard-status] JSON2Video status:', statusData);

          if (statusData.movie?.status === 'done' || statusData.movie?.status === 'success') {
            status = 'complete';
            progress = 100;
            videoUrl = statusData.movie.url;

            // Update database with video URL and quota info
            await supabaseClient
              .from('storyboards')
              .update({
                status: 'complete',
                video_url: videoUrl,
                video_storage_path: videoUrl,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                api_quota_remaining: statusData.remaining_quota?.time || null
              })
              .eq('id', storyboardId);
              
            console.log('[poll-storyboard-status] Storyboard completed:', videoUrl);
            console.log('[poll-storyboard-status] API quota remaining:', statusData.remaining_quota?.time);
            
          } else if (statusData.movie?.status === 'error' || statusData.movie?.status === 'failed') {
            status = 'failed';
            progress = 0;

            // Refund tokens
            const tokenCost = storyboard.estimated_render_cost || 800;
            await supabaseClient.rpc('increment_tokens', {
              user_id_param: user.id,
              amount: tokenCost
            });

            // Update database
            await supabaseClient
              .from('storyboards')
              .update({
                status: 'failed',
                updated_at: new Date().toISOString()
              })
              .eq('id', storyboardId);
              
            console.error('[poll-storyboard-status] Storyboard rendering failed');
            
          } else if (statusData.movie?.status === 'rendering' || statusData.movie?.status === 'processing') {
            status = 'rendering';
            progress = statusData.movie.progress || 50;
            console.log('[poll-storyboard-status] Rendering in progress:', progress);
          }
        } else {
          console.warn('[poll-storyboard-status] JSON2Video API error:', statusResponse.status);
          // Fall back to webhook-based updates
          progress = 50;
        }
      } catch (error) {
        console.error('[poll-storyboard-status] Error checking JSON2Video status:', error);
        // Fall back to webhook-based updates
        progress = 50;
      }
    } else if (status === 'draft') {
      progress = 0;
    } else {
      progress = 50; // Rendering but no job ID yet
    }

    return new Response(
      JSON.stringify({
        status,
        progress,
        videoUrl,
        renderJobId: storyboard.render_job_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});