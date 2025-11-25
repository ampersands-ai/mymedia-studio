/**
 * Runware Recovery Function
 * Handles recovery of Runware generations (primarily for retry logic)
 * Note: Runware is synchronous, so this mainly handles retry scenarios
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { webhookLogger } from "../../_shared/logger.ts";
import { GENERATION_STATUS } from "../../_shared/constants.ts";
import { getErrorMessage } from "../../_shared/error-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generation_id } = await req.json();
    
    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: 'generation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webhookLogger.info('Runware recovery started', { generationId: generation_id });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get generation details
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generation_id)
      .single();

    if (genError || !generation) {
      webhookLogger.error('Generation not found', genError, { generationId: generation_id });
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Runware is synchronous - if stuck in processing, it likely failed
    // Mark as failed and refund tokens
    if (generation.status === GENERATION_STATUS.PROCESSING) {
      webhookLogger.info('Marking stuck Runware generation as failed', { 
        generationId: generation_id 
      });

      await supabase
        .from('generations')
        .update({
          status: GENERATION_STATUS.FAILED,
          error_message: 'Generation timed out - Runware sync call did not complete',
          completed_at: new Date().toISOString()
        })
        .eq('id', generation_id);

      // Refund tokens
      if (generation.tokens_used) {
        await supabase.rpc('increment_tokens', {
          user_id_param: generation.user_id,
          amount: generation.tokens_used
        });

        webhookLogger.info('Refunded tokens', { 
          generationId: generation_id,
          amount: generation.tokens_used 
        });
      }

      webhookLogger.success(generation_id, { 
        recovered: true,
        action: 'marked_failed_and_refunded'
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          generation_id,
          status: GENERATION_STATUS.FAILED,
          action: 'marked_as_failed_and_refunded',
          message: 'Runware sync generation timed out - marked as failed and refunded'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generation is not in processing state
    webhookLogger.info('Generation not in processing state', { 
      generationId: generation_id,
      currentStatus: generation.status 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        generation_id,
        status: generation.status,
        message: `Generation already in ${generation.status} state - no recovery needed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    webhookLogger.error('Recovery failed', error, {});
    return new Response(
      JSON.stringify({ 
        error: 'Recovery failed',
        message: getErrorMessage(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
