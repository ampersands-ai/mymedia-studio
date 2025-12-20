import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { validateSignature } from "./security/signature-validator.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";

Deno.serve(async (req) => {
  const webhookStartTime = Date.now();
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('json2video-webhook', requestId);

  // Get response headers (includes CORS + security headers)
  const responseHeaders = getResponseHeaders(req);

  // Phase 3: Add health check endpoint for webhook diagnostics
  if (req.method === 'GET') {
    logger.info('Health check requested');
    return new Response(
      JSON.stringify({
        status: 'OK',
        service: 'json2video-webhook',
        timestamp: new Date().toISOString(),
        webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/json2video-webhook`
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Handle CORS preflight with secure origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    logger.info('Webhook request received', {
      metadata: {
        method: req.method,
        url: req.url,
      }
    });

    // === SIGNATURE VALIDATION ===
    // Validate signature on raw body before JSON parsing for integrity check
    const rawBody = await req.text();
    const signature = req.headers.get('X-Json2Video-Signature') || req.headers.get('X-Signature');
    const signatureResult = validateSignature(rawBody, signature, logger);

    if (!signatureResult.success) {
      logger.error('Signature validation failed', new Error(signatureResult.error));
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = JSON.parse(rawBody);
    logger.info('Payload received and validated');

    const { project, status, url, error, progress, id, success } = payload;
    logger.debug('Parsed webhook values', { 
      metadata: { project, status, url, error, progress, id, success } 
    });

    // ✅ CRITICAL: JSON2Video sends both 'project' (the ID we saved) and 'id' (render task ID)
    // We must use 'project' to match our database render_job_id
    const renderJobId = project || id; // Prioritize 'project' over 'id'

    // Also check for 'success' field to determine completion
    const isComplete = success === true || status === 'done' || status === 'success';
    
    if (!renderJobId) {
      logger.error('Missing render job ID in payload');
      return new Response(
        JSON.stringify({ error: 'Missing render job ID' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Looking up storyboard', { metadata: { renderJobId } });

    // Find storyboard by render_job_id (which matches the JSON2Video project ID)
    const { data: storyboard, error: fetchError } = await supabaseClient
      .from('storyboards')
      .select('*')
      .eq('render_job_id', renderJobId)
      .single();

    if (fetchError || !storyboard) {
      logger.error('Storyboard not found', fetchError || new Error('Not found'), {
        metadata: { renderJobId }
      });
      return new Response(
        JSON.stringify({ error: 'Storyboard not found' }),
        { status: 404, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Storyboard found', { metadata: { storyboardId: storyboard.id } });

    // Update storyboard based on status
    interface StoryboardUpdate {
      updated_at: string;
      status?: string;
      video_url?: string;
      completed_at?: string;
      error_message?: string;
    }

    const updates: StoryboardUpdate = {
      updated_at: new Date().toISOString()
    };

    // Update storyboard based on status
    if (isComplete) {
      updates.status = 'complete';
      updates.video_url = url;
      updates.completed_at = new Date().toISOString();
      logger.info('Video rendering completed', { metadata: { url, storyboardId: storyboard.id } });
      
      // Invoke download function to store in Supabase Storage
      logger.info('Triggering video download to Supabase Storage');
      const { error: downloadError } = await supabaseClient.functions.invoke(
        'download-storyboard-video',
        {
          body: {
            storyboardId: storyboard.id,
            videoUrl: url,
            userId: storyboard.user_id
          }
        }
      );
      
      if (downloadError) {
        logger.error('Failed to trigger download', new Error(downloadError.message || 'Download function invocation failed'));
      } else {
        logger.info('Download function invoked successfully');
      }
      
      // Trigger email notification if enabled
      if (storyboard.notify_on_completion) {
        logger.info('Triggering completion notification for storyboard', { metadata: { storyboardId: storyboard.id } });
        try {
          await supabaseClient.functions.invoke('notify-generation-complete', {
            body: {
              generation_id: storyboard.id,
              user_id: storyboard.user_id,
              generation_duration_seconds: storyboard.duration || 60,
              type: 'storyboard',
              storyboard_title: storyboard.topic,
            }
          });
        } catch (notifyError) {
          logger.error('Failed to send completion notification', notifyError as Error, { metadata: { storyboardId: storyboard.id } });
        }
      }
    } else if (status === 'error' || status === 'failed') {
      updates.status = 'failed';
      
      // Refund credits to user
      const tokenCost = storyboard.estimated_render_cost || 0;
      const { error: refundError } = await supabaseClient.rpc('increment_tokens', {
        user_id_param: storyboard.user_id,
        amount: tokenCost
      });
      
      if (refundError) {
        logger.error('Credit refund failed', refundError instanceof Error ? refundError : new Error(String(refundError) || 'Refund error'));
      } else {
        logger.info('Credits refunded', { metadata: { tokenCost } });
      }
      
      logger.error('Video rendering failed', new Error(error || 'Unknown error'));
    } else if (status === 'rendering') {
      updates.status = 'rendering';
      logger.info('Video rendering in progress', { metadata: { progress } });
    }

    const { error: updateError } = await supabaseClient
      .from('storyboards')
      .update(updates)
      .eq('id', storyboard.id);

    if (updateError) {
      logger.error('Failed to update storyboard', updateError instanceof Error ? updateError : new Error(String(updateError) || 'Database error'));
      return new Response(
        JSON.stringify({ error: 'Failed to update storyboard' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Storyboard updated successfully');
    logger.logDuration('Webhook processing', webhookStartTime);

    return new Response(
      JSON.stringify({ success: true, storyboardId: storyboard.id }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Webhook processing failed', error as Error);
    
    // Track webhook analytics for failure
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase.from('webhook_analytics').insert({
      provider: 'json2video',
      event_type: 'render_complete',
      status: 'failure',
      duration_ms: Date.now() - webhookStartTime,
      error_code: 'WEBHOOK_ERROR',
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    }).then(({ error: analyticsError }) => {
      if (analyticsError) logger.error('Failed to track analytics', analyticsError instanceof Error ? analyticsError : new Error(String(analyticsError) || 'Analytics error'));
    });
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'WEBHOOK_ERROR'
      }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
