import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";



/**
 * Auto-timeout generations stuck in processing for more than 10 minutes
 * This function should be called periodically (every 5 minutes via cron)
 */
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

    // Find generations stuck in processing for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: stuckGenerations, error: fetchError } = await supabase
      .from('generations')
      .select('id, user_id, tokens_used, model_id, prompt')
      .eq('status', GENERATION_STATUS.PROCESSING)
      .lt('created_at', tenMinutesAgo);

    if (fetchError) {
      throw new Error(`Failed to fetch stuck generations: ${fetchError.message}`);
    }

    if (!stuckGenerations || stuckGenerations.length === 0) {
      logger.info("No stuck generations found");
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
        // Mark as failed with timeout message
        const { error: updateError } = await supabase
          .from('generations')
          .update({
            status: GENERATION_STATUS.FAILED,
            provider_response: {
              error: 'Generation timed out after 10 minutes. Your tokens have been automatically refunded.',
              auto_timeout: true,
              timed_out_at: new Date().toISOString()
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
            tokensRefunded: gen.tokens_used 
          } 
        });
        successCount++;

      } catch (error: any) {
        logger.error("Error processing generation", error, { 
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

  } catch (error: any) {
    logger.error("Auto-timeout error", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
