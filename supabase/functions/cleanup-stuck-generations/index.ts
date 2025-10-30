import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting cleanup of stuck generations...');

    // Find stuck generations (pending or processing for more than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const { data: stuckGenerations, error: findError } = await supabase
      .from('generations')
      .select('id, user_id, model_id, tokens_used, type')
      .in('status', ['pending', 'processing'])
      .lt('created_at', thirtyMinutesAgo.toISOString());

    if (findError) {
      throw findError;
    }

    if (!stuckGenerations || stuckGenerations.length === 0) {
      console.log('No stuck generations found');
      return new Response(
        JSON.stringify({ message: 'No stuck generations found', cleaned: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${stuckGenerations.length} stuck generations to clean up`);

    // Update stuck generations to failed status
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        status: 'failed',
        provider_response: {
          error: 'Generation timed out after 30 minutes. This can happen when the AI service is overloaded. Your tokens have been refunded - please try again.',
          reason: 'timeout',
          auto_cleaned: true
        }
      })
      .in('status', ['pending', 'processing'])
      .lt('created_at', thirtyMinutesAgo.toISOString());

    if (updateError) {
      throw updateError;
    }

    // Refund credits for each stuck generation
    for (const gen of stuckGenerations) {
      console.log(`Refunding ${gen.tokens_used} credits to user ${gen.user_id}`);
      
      const { error: refundError } = await supabase.rpc('increment_tokens', {
        user_id_param: gen.user_id,
        amount: gen.tokens_used
      });

      if (refundError) {
        console.error(`Failed to refund tokens for generation ${gen.id}:`, refundError);
        // Continue with other refunds even if one fails
      }

      // Log the cleanup action
      await supabase.from('audit_logs').insert({
        user_id: gen.user_id,
        action: 'generation_auto_cleaned',
        resource_type: 'generation',
        resource_id: gen.id,
        metadata: {
          model_id: gen.model_id,
          tokens_refunded: gen.tokens_used,
          reason: 'timeout_30min',
          content_type: gen.type
        }
      });
    }

    console.log(`Successfully cleaned up ${stuckGenerations.length} stuck generations`);

    return new Response(
      JSON.stringify({
        message: 'Cleanup completed',
        cleaned: stuckGenerations.length,
        generations: stuckGenerations.map(g => g.id)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in cleanup-stuck-generations:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
