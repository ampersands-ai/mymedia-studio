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
    const { generation_ids } = await req.json();
    
    if (!generation_ids || !Array.isArray(generation_ids) || generation_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid generation_ids array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Manually failing ${generation_ids.length} generations:`, generation_ids);

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
      console.log(`Failing generation ${gen.id}, refunding ${gen.tokens_used} tokens`);
      
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
        console.error(`Failed to update generation ${gen.id}:`, updateError);
        results.push({ id: gen.id, success: false, error: updateError.message });
        continue;
      }

      // Refund tokens
      const { error: refundError } = await supabase.rpc('increment_tokens', {
        user_id_param: gen.user_id,
        amount: gen.tokens_used
      });

      if (refundError) {
        console.error(`Failed to refund tokens for ${gen.id}:`, refundError);
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        total_tokens_refunded: totalTokensRefunded,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Manual fail error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
