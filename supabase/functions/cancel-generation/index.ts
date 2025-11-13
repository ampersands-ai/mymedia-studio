
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { 
  CancelGenerationSchema,
  validateRequest,
  createValidationErrorResponse 
} from "../_shared/validation.ts";
import {
  handleOptionsRequest,
  createJsonResponse,
  createErrorResponse,
  corsHeaders
} from "../_shared/cors-headers.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest();
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
      return createErrorResponse('Missing authorization header', 401);
    }

    // Verify user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logger.error('Authentication failed', authError, { requestId });
      return createErrorResponse('Unauthorized', 401);
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
      return createValidationErrorResponse(validation.formattedErrors, corsHeaders);
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
        generationId: generation_id,
        requestId
      });
      return createErrorResponse('Generation not found or access denied', 404);
    }

    // Only allow canceling if still processing
    if (generation.status !== 'processing') {
      logger.warn('Cannot cancel generation with current status', {
        userId: user.id,
        generationId: generation_id,
        currentStatus: generation.status,
        requestId
      });
      return createErrorResponse(
        `Cannot cancel generation with status: ${generation.status}`,
        400
      );
    }

    logger.info('Canceling generation', {
      userId: user.id,
      generationId: generation_id,
      requestId
    });
      
    // Mark as failed with user cancellation message
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        status: 'failed',
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
      tokensRefunded: generation.tokens_used,
      requestId
    });

    logger.logDuration('cancel-generation', startTime, { userId: user.id, requestId });

    return createJsonResponse({
      success: true,
      message: 'Generation canceled and tokens refunded',
      tokens_refunded: generation.tokens_used
    });

  } catch (error) {
    const err = error as Error;
    logger.error('Cancel generation error', err, { requestId });
    return createErrorResponse(err.message, 500);
  }
});
