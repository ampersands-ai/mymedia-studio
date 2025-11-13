
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Phase 3: Add health check endpoint for webhook diagnostics
  if (req.method === 'GET') {
    console.log('[json2video-webhook] Health check requested');
    return new Response(
      JSON.stringify({ 
        status: 'OK', 
        service: 'json2video-webhook',
        timestamp: new Date().toISOString(),
        webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/json2video-webhook`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Enhanced logging for webhook diagnostics
    console.log('[json2video-webhook] === WEBHOOK REQUEST RECEIVED ===');
    console.log('[json2video-webhook] Method:', req.method);
    console.log('[json2video-webhook] Headers:', Object.fromEntries(req.headers.entries()));
    console.log('[json2video-webhook] URL:', req.url);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('[json2video-webhook] === PAYLOAD RECEIVED ===');
    console.log('[json2video-webhook] Full Payload:', JSON.stringify(payload, null, 2));

    const { project, status, url, error, progress, id, success } = payload;
    console.log('[json2video-webhook] Parsed Values:', { project, status, url, error, progress, id, success });

    // ✅ CRITICAL: JSON2Video sends both 'project' (the ID we saved) and 'id' (render task ID)
    // We must use 'project' to match our database render_job_id
    const renderJobId = project || id; // Prioritize 'project' over 'id'

    // Also check for 'success' field to determine completion
    const isComplete = success === true || status === 'done' || status === 'success';
    
    if (!renderJobId) {
      console.error('[json2video-webhook] Missing render job ID in payload');
      return new Response(
        JSON.stringify({ error: 'Missing render job ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[json2video-webhook] Looking up storyboard by render_job_id:', renderJobId);

    // Find storyboard by render_job_id (which matches the JSON2Video project ID)
    const { data: storyboard, error: fetchError } = await supabaseClient
      .from('storyboards')
      .select('*')
      .eq('render_job_id', renderJobId)
      .single();

    if (fetchError || !storyboard) {
      console.error('[json2video-webhook] Storyboard not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Storyboard not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[json2video-webhook] Found storyboard:', storyboard.id);

    // Update storyboard based on status
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    // Update storyboard based on status
    if (isComplete) {
      updates.status = 'complete';
      updates.video_url = url;
      updates.completed_at = new Date().toISOString();
      console.log('[json2video-webhook] ✅ Video rendering completed successfully!');
      console.log('[json2video-webhook] Video URL stored:', url);
      
      // Invoke download function to store in Supabase Storage
      console.log('[json2video-webhook] Triggering video download to Supabase Storage...');
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
        console.error('[json2video-webhook] Failed to trigger download:', downloadError);
      } else {
        console.log('[json2video-webhook] Download function invoked successfully');
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
        console.error('[json2video-webhook] Credit refund failed:', refundError);
      } else {
        console.log('[json2video-webhook] Refunded credits:', tokenCost);
      }
      
      console.error('[json2video-webhook] Video rendering failed:', error);
    } else if (status === 'rendering') {
      updates.status = 'rendering';
      console.log('[json2video-webhook] Video rendering in progress:', progress);
    }

    const { error: updateError } = await supabaseClient
      .from('storyboards')
      .update(updates)
      .eq('id', storyboard.id);

    if (updateError) {
      console.error('[json2video-webhook] Failed to update storyboard:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update storyboard' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[json2video-webhook] Storyboard updated successfully');

    return new Response(
      JSON.stringify({ success: true, storyboardId: storyboard.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[json2video-webhook] Error:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'WEBHOOK_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
