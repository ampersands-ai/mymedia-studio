import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('cleanup-stuck-generations', requestId);
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logger.info('Starting stuck generations cleanup');

    // Find generations stuck in pending/processing for more than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: stuckGenerations, error: fetchError } = await supabase
      .from('generations')
      .select('id, user_id, model_id, prompt, status, created_at, tokens_used')
      .in('status', ['pending', 'processing'])
      .lt('created_at', thirtyMinutesAgo);

    if (fetchError) {
      logger.error('Failed to fetch stuck generations', fetchError);
      throw fetchError;
    }

    const stuckCount = stuckGenerations?.length || 0;

    if (!stuckGenerations || stuckGenerations.length === 0) {
      logger.info('No stuck generations found');
      logger.logDuration('Cleanup completed', startTime);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No stuck generations found',
          cleaned: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info(`Found ${stuckCount} stuck generation(s)`, { 
      metadata: { stuckCount, generationIds: stuckGenerations.map(g => g.id) }
    });

    // Mark all stuck generations as failed
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        status: 'failed',
      })
      .in('id', stuckGenerations.map(g => g.id));

    if (updateError) {
      logger.error('Failed to update stuck generations', updateError);
      throw updateError;
    }

    logger.info('Marked generations as failed', { metadata: { count: stuckCount } });

    // Refund tokens for failed generations
    for (const generation of stuckGenerations) {
      if (generation.tokens_used && generation.tokens_used > 0) {
        logger.info('Refunding tokens', { 
          metadata: { 
            generationId: generation.id, 
            userId: generation.user_id,
            tokensUsed: generation.tokens_used 
          }
        });
        
        const { error: refundError } = await supabase.rpc('increment_tokens', {
          user_id_param: generation.user_id,
          amount: generation.tokens_used,
        });

        if (refundError) {
          logger.error('Failed to refund tokens', refundError, { 
            metadata: { generationId: generation.id }
          });
        }
      }
    }

    // Log the cleanup action
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'cleanup_stuck_generations',
        resource_type: 'generation',
        metadata: {
          cleaned_count: stuckGenerations.length,
          generation_ids: stuckGenerations.map(g => g.id),
          threshold_minutes: 30,
        },
      });

    if (logError) {
      logger.error('Failed to log cleanup action', logError);
    }

    logger.info(`Successfully cleaned up ${stuckCount} stuck generation(s)`);
    logger.logDuration('Cleanup completed', startTime);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${stuckGenerations.length} stuck generation(s)`,
        cleaned: stuckGenerations.length,
        generation_ids: stuckGenerations.map(g => g.id),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Fatal error in cleanup', error as Error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
