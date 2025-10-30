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
    console.log('[json2video-webhook] Received webhook request');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('[json2video-webhook] Payload:', JSON.stringify(payload));

    const { project, status, url, error, progress } = payload;

    if (!project) {
      console.error('[json2video-webhook] Missing project ID in payload');
      return new Response(
        JSON.stringify({ error: 'Missing project ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find storyboard by render_job_id or project ID
    const { data: storyboard, error: fetchError } = await supabaseClient
      .from('storyboards')
      .select('*')
      .or(`id.eq.${project},render_job_id.eq.${project}`)
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

    if (status === 'done' || status === 'success') {
      updates.status = 'complete';
      updates.video_url = url;
      updates.video_storage_path = url; // JSON2Video hosts the video
      updates.completed_at = new Date().toISOString();
      console.log('[json2video-webhook] Video rendering completed:', url);
    } else if (status === 'error' || status === 'failed') {
      updates.status = 'failed';
      
      // Refund credits to user
      const tokenCost = storyboard.estimated_render_cost || 800;
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
