import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('manual-fail-generations', requestId);
  const startTime = Date.now();
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const { generation_ids } = await req.json();
    
    if (!generation_ids || !Array.isArray(generation_ids) || generation_ids.length === 0) {
      logger.warn('Invalid request: missing or invalid generation_ids');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid generation_ids array' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Starting manual generation failure', {
      metadata: { generationCount: generation_ids.length, generationIds: generation_ids }
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get generation details
    const { data: generations, error: getError } = await supabase
      .from('generations')
      .select('id, user_id, tokens_used, status')
      .in('id', generation_ids);

    if (getError || !generations || generations.length === 0) {
      throw new Error('Generations not found');
    }

    let totalTokensRefunded = 0;
    const results = [];

    for (const gen of generations) {
      logger.info('Failing generation', { 
        metadata: { generationId: gen.id, tokensUsed: gen.tokens_used, userId: gen.user_id }
      });
      
      // Update to failed
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'failed',
          provider_response: {
            error: 'Manually failed due to timeout. Tokens have been refunded.',
            manual_fail_at: new Date().toISOString()
          }
        })
        .eq('id', gen.id);

      if (updateError) {
        logger.error('Failed to update generation', updateError as Error, {
          metadata: { generationId: gen.id }
        });
        results.push({ id: gen.id, success: false, error: updateError.message });
        continue;
      }

      // Refund tokens
      const { error: refundError } = await supabase.rpc('increment_tokens', {
        user_id_param: gen.user_id,
        amount: gen.tokens_used
      });

      if (refundError) {
        logger.error('Failed to refund tokens', refundError as Error, {
          metadata: { generationId: gen.id, tokensUsed: gen.tokens_used }
        });
        results.push({ id: gen.id, success: false, error: refundError.message });
        continue;
      }

      totalTokensRefunded += gen.tokens_used;
      results.push({ id: gen.id, success: true, tokens_refunded: gen.tokens_used });

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: gen.user_id,
        action: 'generation_manually_failed',
        resource_type: 'generation',
        resource_id: gen.id,
        metadata: {
          tokens_refunded: gen.tokens_used,
          previous_status: gen.status
        }
      });
    }

    logger.info('Manual generation failure completed', {
      metadata: { 
        totalTokensRefunded, 
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      }
    });
    logger.logDuration('Manual generation failure', startTime);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total_tokens_refunded: totalTokensRefunded,
        results 
      }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logger.error('Manual fail error', error as Error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
