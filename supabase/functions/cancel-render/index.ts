import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSafeErrorResponse } from '../_shared/error-handler.ts';
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('cancel-render', requestId);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
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
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { storyboardId } = await req.json();

    if (!storyboardId) {
      return new Response(
        JSON.stringify({ error: 'storyboardId is required' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info("Canceling render for storyboard", { metadata: { storyboardId } });

    // Fetch storyboard to verify ownership and status
    const { data: storyboard, error: fetchError } = await supabaseClient
      .from('storyboards')
      .select('id, user_id, status, render_job_id')
      .eq('id', storyboardId)
      .single();

    if (fetchError || !storyboard) {
      logger.error("Storyboard not found", fetchError instanceof Error ? fetchError : new Error(String(fetchError) || 'Database error'));
      return new Response(
        JSON.stringify({ error: 'Storyboard not found' }),
        { status: 404, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    if (storyboard.user_id !== user.id) {
      logger.error("User does not own this storyboard", undefined, { 
        userId: user.id, 
        metadata: { storyboardUserId: storyboard.user_id } 
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if storyboard is in rendering status
    if (storyboard.status !== 'rendering') {
      logger.warn("Storyboard is not in rendering status", { 
        metadata: { storyboardId, status: storyboard.status } 
      });
      return new Response(
        JSON.stringify({ error: `Cannot cancel: storyboard is in ${storyboard.status} status` }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NOTE: JSON2Video does not have a cancel/delete endpoint
    // The job will continue on their servers, but we'll update our database
    // to stop tracking it and allow the user to edit and re-render
    logger.info("JSON2Video job will continue but won't be saved", { 
      metadata: { storyboardId, renderJobId: storyboard.render_job_id } 
    });

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
      logger.error("Failed to update storyboard", updateError instanceof Error ? updateError : new Error(String(updateError) || 'Database error'), { metadata: { storyboardId } });
      throw updateError;
    }

    logger.info("Successfully canceled render tracking", { metadata: { storyboardId } });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Render canceled. Status updated to draft.',
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error("Error canceling render", error as Error);
    return createSafeErrorResponse(error, 'cancel-render', responseHeaders);
  }
});
