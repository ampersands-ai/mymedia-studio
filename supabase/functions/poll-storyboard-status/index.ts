import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";



serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('poll-storyboard-status', requestId);

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
      } catch {
        // Body parsing failed, continue with null
      }
    }

    logger.info('storyboardId received', { metadata: { storyboardId } });

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
      logger.info('Storyboard already finalized', { metadata: { status } });
      
      return new Response(
        JSON.stringify({
          status,
          progress,
          videoUrl,
          renderJobId: storyboard.render_job_id
        }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check JSON2Video API for real status
    if (storyboard.render_job_id && status === 'rendering') {
      const json2videoApiKey = Deno.env.get('JSON2VIDEO_API_KEY');
      
      if (!json2videoApiKey) {
        logger.warn('JSON2VIDEO_API_KEY not configured, using webhook-only mode');
        // Return current status, webhook will update when ready
        return new Response(
          JSON.stringify({
            status,
            progress: 50,
            videoUrl: null,
            renderJobId: storyboard.render_job_id,
            message: 'Waiting for webhook notification'
          }),
          { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        logger.info('Checking JSON2Video status', { metadata: { renderJobId: storyboard.render_job_id } });

        const statusResponse = await fetch(
          API_ENDPOINTS.JSON2VIDEO.getMovieStatusUrl(storyboard.render_job_id),
          {
            headers: {
              'x-api-key': json2videoApiKey
            }
          }
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          logger.info('JSON2Video status retrieved', { metadata: { status: statusData.movie?.status } });

          if (statusData.movie?.status === 'done' || statusData.movie?.status === 'success') {
            status = 'complete';
            progress = 100;
            videoUrl = statusData.movie.url;

            // Update database with completion status (storage path will be set by download function)
            await supabaseClient
              .from('storyboards')
              .update({
                status: 'complete',
                video_url: videoUrl,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                api_quota_remaining: statusData.remaining_quota?.time || null
              })
              .eq('id', storyboardId);

            // Trigger background storage upload (fire and forget)
            supabaseClient.functions.invoke('download-storyboard-video', {
              body: { 
                storyboardId, 
                videoUrl,
                userId: user.id 
              }
            }).then(downloadResult => {
              if (downloadResult.error) {
                logger.error('Storage upload failed', new Error(downloadResult.error.message));
              } else {
                logger.info('Video stored', { metadata: { storagePath: downloadResult.data?.storagePath } });
              }
            }).catch(error => {
              logger.error('Background storage upload error', error);
            });
              
            logger.info('Render complete, storage upload initiated', { metadata: { quotaRemaining: statusData.remaining_quota?.time } });
            
          } else if (statusData.movie?.status === 'error' || statusData.movie?.status === GENERATION_STATUS.FAILED) {
            status = 'failed';
            progress = 0;

            // Refund tokens
            const tokenCost = storyboard.estimated_render_cost || 0;
            await supabaseClient.rpc('increment_tokens', {
              user_id_param: user.id,
              amount: tokenCost
            });

            // Update database
            await supabaseClient
              .from('storyboards')
              .update({
                status: GENERATION_STATUS.FAILED,
                updated_at: new Date().toISOString()
              })
              .eq('id', storyboardId);
              
            logger.error('Storyboard rendering failed');
            
          } else if (statusData.movie?.status === 'rendering' || statusData.movie?.status === GENERATION_STATUS.PROCESSING) {
            status = 'rendering';
            progress = statusData.movie.progress || 50;
            logger.info('Rendering in progress', { metadata: { progress } });
          }
        } else {
          logger.warn('JSON2Video API error', { metadata: { status: statusResponse.status } });
          // Fall back to webhook-based updates
          progress = 50;
        }
      } catch (error) {
        logger.error('Error checking JSON2Video status', error instanceof Error ? error : new Error(String(error)));
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
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Poll storyboard status error', error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});