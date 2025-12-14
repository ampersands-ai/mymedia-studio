import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { 
  DeleteStoryboardSchema, 
  validateRequest,
  createValidationErrorResponse 
} from '../_shared/validation.ts';

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const logger = new EdgeLogger('delete-storyboard', requestId);

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
      logger.error('Unauthorized access attempt');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    
    // Validate request
    const validation = validateRequest(DeleteStoryboardSchema, body, logger, 'delete-storyboard');
    if (!validation.success) {
      return createValidationErrorResponse(validation.formattedErrors, responseHeaders);
    }
    
    const { storyboardId } = validation.data;

    logger.info('Deleting storyboard', { 
      userId: user.id, 
      metadata: { storyboardId } 
    });

    // Verify storyboard belongs to the user
    const { data: storyboard, error: verifyError } = await supabaseClient
      .from('storyboards')
      .select('id')
      .eq('id', storyboardId)
      .eq('user_id', user.id)
      .single();

    if (verifyError || !storyboard) {
      logger.error('Storyboard not found or unauthorized', verifyError, { 
        metadata: { storyboardId } 
      });
      return new Response(JSON.stringify({ error: 'Storyboard not found or unauthorized' }), {
        status: 404,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete all scenes first (foreign key constraint)
    const { error: scenesError } = await supabaseClient
      .from('storyboard_scenes')
      .delete()
      .eq('storyboard_id', storyboardId);

    if (scenesError) {
      logger.error('Error deleting scenes', scenesError instanceof Error ? scenesError : new Error(String(scenesError) || 'Database error'));
      return new Response(JSON.stringify({ error: 'Failed to delete storyboard scenes' }), {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete the storyboard
    const { error: storyboardError } = await supabaseClient
      .from('storyboards')
      .delete()
      .eq('id', storyboardId);

    if (storyboardError) {
      logger.error('Error deleting storyboard', storyboardError instanceof Error ? storyboardError : new Error(String(storyboardError) || 'Database error'));
      return new Response(JSON.stringify({ error: 'Failed to delete storyboard' }), {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.logDuration('delete-storyboard', startTime, { 
      userId: user.id, 
      metadata: { storyboardId } 
    });
    logger.info('Successfully deleted storyboard and scenes');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const err = error as Error;
    logger.error('Delete storyboard failed', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }
});
