
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import {
  CancelGenerationSchema,
  validateRequest,
  createValidationErrorResponse
} from "../_shared/validation.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const logger = new EdgeLogger('cancel-generation', requestId, supabase, true);

  try {
    logger.info('Cancel generation request received', { requestId });
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.warn('Missing authorization header', { requestId });
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logger.error('Authentication failed', authError || undefined, { requestId });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('User authenticated', { userId: user.id, requestId });

    // Validate request body
    const body = await req.json();
    const validation = validateRequest(
      CancelGenerationSchema,
      body,
      logger,
      'cancel-generation-request'
    );

    if (!validation.success) {
      return createValidationErrorResponse(validation.formattedErrors, responseHeaders);
    }

    const { generation_id } = validation.data;

    // Get generation details and verify ownership
    const { data: generation, error: getError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generation_id)
      .eq('user_id', user.id) // Only allow canceling own generations
      .maybeSingle();

    if (getError || !generation) {
      logger.warn('Generation not found or access denied', {
        userId: user.id,
        requestId,
        metadata: { generationId: generation_id }
      });
      return new Response(
        JSON.stringify({ error: 'Generation not found or access denied' }),
        { status: 404, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow canceling if still processing
    if (generation.status !== GENERATION_STATUS.PROCESSING) {
      logger.warn('Cannot cancel generation with current status', {
        userId: user.id,
        requestId,
        metadata: { 
          generationId: generation_id,
          currentStatus: generation.status
        }
      });
      return new Response(
        JSON.stringify({ error: `Cannot cancel generation with status: ${generation.status}` }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Canceling generation', {
      userId: user.id,
      requestId,
      metadata: { generationId: generation_id }
    });
      
    // Mark as failed with user cancellation message
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        status: GENERATION_STATUS.FAILED,
        provider_response: {
          error: 'Generation canceled by user',
          canceled_at: new Date().toISOString(),
          canceled_by: user.id
        }
      })
      .eq('id', generation_id);

    if (updateError) {
      throw new Error(`Failed to update generation: ${updateError.message}`);
    }

    // Refund tokens
    await supabase.rpc('increment_tokens', {
      user_id_param: user.id,
      amount: generation.tokens_used
    });

    logger.info('Tokens refunded', {
      userId: user.id,
      requestId,
      metadata: { tokensRefunded: generation.tokens_used }
    });

    logger.logDuration('cancel-generation', startTime, { userId: user.id, requestId });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Generation canceled and tokens refunded',
        tokens_refunded: generation.tokens_used
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const err = error as Error;
    logger.error('Cancel generation error', err, { requestId });
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
