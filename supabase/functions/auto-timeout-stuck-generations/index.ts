import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { GENERATION_STATUS, GENERATION_TIMEOUTS } from "../_shared/constants.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

/**
 * Auto-timeout generations stuck in processing
 * 
 * Uses model-aware timeouts:
 * - Standard models: 60 minutes
 * - Long-running models (sora, storyboard, etc.): 180 minutes
 * 
 * This function should be called periodically (every 5 minutes via cron)
 */

// Check if a model is a long-running model
function isLongRunningModel(modelId: string | null): boolean {
  if (!modelId) return false;
  const lowerModelId = modelId.toLowerCase();
  return GENERATION_TIMEOUTS.LONG_RUNNING_PATTERNS.some(
    pattern => lowerModelId.includes(pattern)
  );
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('auto-timeout-stuck-generations', requestId);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate timeout thresholds
    const now = Date.now();
    const defaultTimeoutThreshold = new Date(now - GENERATION_TIMEOUTS.DEFAULT_MS).toISOString();
    const longRunningTimeoutThreshold = new Date(now - GENERATION_TIMEOUTS.LONG_RUNNING_MS).toISOString();
    
    // Fetch all processing generations
    const { data: processingGenerations, error: fetchError } = await supabase
      .from('generations')
      .select('id, user_id, tokens_used, model_id, prompt, created_at')
      .eq('status', GENERATION_STATUS.PROCESSING);

    if (fetchError) {
      throw new Error(`Failed to fetch processing generations: ${fetchError.message}`);
    }

    if (!processingGenerations || processingGenerations.length === 0) {
      logger.info("No processing generations found");
      return new Response(
        JSON.stringify({ message: 'No processing generations found', count: 0 }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter stuck generations based on model-specific timeouts
    const stuckGenerations = processingGenerations.filter(gen => {
      const createdAt = new Date(gen.created_at).toISOString();
      const isLongRunning = isLongRunningModel(gen.model_id);
      const threshold = isLongRunning ? longRunningTimeoutThreshold : defaultTimeoutThreshold;
      return createdAt < threshold;
    });

    if (stuckGenerations.length === 0) {
      logger.info("No stuck generations found", { 
        metadata: { processingCount: processingGenerations.length } 
      });
      return new Response(
        JSON.stringify({ message: 'No stuck generations found', count: 0 }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info("Found stuck generations, auto-timing out", { 
      metadata: { stuckCount: stuckGenerations.length } 
    });

    let successCount = 0;
    let errorCount = 0;

    // Process each stuck generation
    for (const gen of stuckGenerations) {
      try {
        const isLongRunning = isLongRunningModel(gen.model_id);
        const timeoutMinutes = isLongRunning 
          ? Math.round(GENERATION_TIMEOUTS.LONG_RUNNING_MS / 60000)
          : Math.round(GENERATION_TIMEOUTS.DEFAULT_MS / 60000);

        // Mark as failed with timeout message
        const { error: updateError } = await supabase
          .from('generations')
          .update({
            status: GENERATION_STATUS.FAILED,
            provider_response: {
              error: `Generation timed out after ${timeoutMinutes} minutes. Your tokens have been automatically refunded.`,
              auto_timeout: true,
              timed_out_at: new Date().toISOString(),
              model_type: isLongRunning ? 'long_running' : 'standard'
            }
          })
          .eq('id', gen.id);

        if (updateError) {
          logger.error("Failed to update generation", updateError instanceof Error ? updateError : new Error(String(updateError) || 'Database error'), {
            metadata: { generationId: gen.id }
          });
          errorCount++;
          continue;
        }

        // Refund tokens
        await supabase.rpc('increment_tokens', {
          user_id_param: gen.user_id,
          amount: gen.tokens_used
        });

        logger.info("Timed out generation and refunded tokens", { 
          userId: gen.user_id,
          metadata: { 
            generationId: gen.id, 
            tokensRefunded: gen.tokens_used,
            modelId: gen.model_id,
            isLongRunning
          } 
        });
        successCount++;

      } catch (error) {
        logger.error("Error processing generation", error as Error, { 
          metadata: { generationId: gen.id } 
        });
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Auto-timeout completed`,
        total: stuckGenerations.length,
        success: successCount,
        errors: errorCount
      }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error("Auto-timeout error", error as Error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message || String(error) }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
