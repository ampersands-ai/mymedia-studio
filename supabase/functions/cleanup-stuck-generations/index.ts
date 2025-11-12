import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Cleanup] Starting stuck generations cleanup...');

    // Find generations stuck in pending/processing for more than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: stuckGenerations, error: fetchError } = await supabase
      .from('generations')
      .select('id, user_id, model_id, prompt, status, created_at, tokens_used')
      .in('status', ['pending', 'processing'])
      .lt('created_at', thirtyMinutesAgo);

    if (fetchError) {
      console.error('[Cleanup] Error fetching stuck generations:', fetchError);
      throw fetchError;
    }

    if (!stuckGenerations || stuckGenerations.length === 0) {
      console.log('[Cleanup] No stuck generations found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No stuck generations found',
          cleaned: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cleanup] Found ${stuckGenerations.length} stuck generation(s)`);

    // Mark all stuck generations as failed
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        status: 'failed',
      })
      .in('id', stuckGenerations.map(g => g.id));

    if (updateError) {
      console.error('[Cleanup] Error updating stuck generations:', updateError);
      throw updateError;
    }

    // Refund tokens for failed generations
    for (const generation of stuckGenerations) {
      if (generation.tokens_used && generation.tokens_used > 0) {
        console.log(`[Cleanup] Refunding ${generation.tokens_used} tokens for generation ${generation.id}`);
        
        const { error: refundError } = await supabase.rpc('increment_tokens', {
          user_id_param: generation.user_id,
          amount: generation.tokens_used,
        });

        if (refundError) {
          console.error(`[Cleanup] Error refunding tokens for generation ${generation.id}:`, refundError);
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
      console.error('[Cleanup] Error logging cleanup action:', logError);
    }

    console.log(`[Cleanup] Successfully cleaned up ${stuckGenerations.length} stuck generation(s)`);

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
    console.error('[Cleanup] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
