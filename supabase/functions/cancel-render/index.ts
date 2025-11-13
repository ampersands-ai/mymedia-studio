import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSafeErrorResponse } from '../_shared/error-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { storyboardId } = await req.json();

    if (!storyboardId) {
      return new Response(
        JSON.stringify({ error: 'storyboardId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[cancel-render] Canceling render for storyboard:', storyboardId);

    // Fetch storyboard to verify ownership and status
    const { data: storyboard, error: fetchError } = await supabaseClient
      .from('storyboards')
      .select('id, user_id, status, render_job_id')
      .eq('id', storyboardId)
      .single();

    if (fetchError || !storyboard) {
      console.error('[cancel-render] Storyboard not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Storyboard not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    if (storyboard.user_id !== user.id) {
      console.error('[cancel-render] User does not own this storyboard');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if storyboard is in rendering status
    if (storyboard.status !== 'rendering') {
      console.warn('[cancel-render] Storyboard is not in rendering status:', storyboard.status);
      return new Response(
        JSON.stringify({ error: `Cannot cancel: storyboard is in ${storyboard.status} status` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NOTE: JSON2Video does not have a cancel/delete endpoint
    // The job will continue on their servers, but we'll update our database
    // to stop tracking it and allow the user to edit and re-render
    console.log('[cancel-render] Note: JSON2Video job will continue but won\'t be saved');

    // Update storyboard status to 'draft' and clear render_job_id
    // NO TOKEN REFUND - job already started
    const { error: updateError } = await supabaseClient
      .from('storyboards')
      .update({
        status: 'draft',
        render_job_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyboardId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[cancel-render] Failed to update storyboard:', updateError);
      throw updateError;
    }

    console.log('[cancel-render] Successfully canceled render tracking for storyboard:', storyboardId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Render canceled. Status updated to draft.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[cancel-render] Error:', error);
    return createSafeErrorResponse(error, 'cancel-render', corsHeaders);
  }
});
