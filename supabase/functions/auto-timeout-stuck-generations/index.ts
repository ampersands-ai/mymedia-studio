import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Auto-timeout generations stuck in processing for more than 10 minutes
 * This function should be called periodically (every 5 minutes via cron)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
      .eq('status', 'processing')
      .lt('created_at', tenMinutesAgo);

    if (fetchError) {
      throw new Error(`Failed to fetch stuck generations: ${fetchError.message}`);
    }

    if (!stuckGenerations || stuckGenerations.length === 0) {
      console.log('No stuck generations found');
      return new Response(
        JSON.stringify({ message: 'No stuck generations found', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${stuckGenerations.length} stuck generation(s), auto-timing out...`);

    let successCount = 0;
    let errorCount = 0;

    // Process each stuck generation
    for (const gen of stuckGenerations) {
      try {
        // Mark as failed with timeout message
        const { error: updateError } = await supabase
          .from('generations')
          .update({
            status: 'failed',
            provider_response: {
              error: 'Generation timed out after 10 minutes. Your tokens have been automatically refunded.',
              auto_timeout: true,
              timed_out_at: new Date().toISOString()
            }
          })
          .eq('id', gen.id);

        if (updateError) {
          console.error(`Failed to update generation ${gen.id}:`, updateError);
          errorCount++;
          continue;
        }

        // Refund tokens
        await supabase.rpc('increment_tokens', {
          user_id_param: gen.user_id,
          amount: gen.tokens_used
        });

        console.log(`✓ Timed out generation ${gen.id}, refunded ${gen.tokens_used} tokens to user ${gen.user_id}`);
        successCount++;

      } catch (error: any) {
        console.error(`Error processing generation ${gen.id}:`, error.message);
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Auto-timeout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
