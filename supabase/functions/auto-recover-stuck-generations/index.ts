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
    console.log('🔄 Starting auto-recovery scan for stuck generations...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find generations stuck in processing for > 3 minutes with provider_task_id
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    
    const { data: stuckGenerations, error: fetchError } = await supabase
      .from('generations')
      .select('id, provider_task_id, user_id, tokens_used, created_at')
      .eq('status', 'processing')
      .not('provider_task_id', 'is', null)
      .lt('created_at', threeMinutesAgo)
      .limit(10);

    if (fetchError) throw fetchError;

    if (!stuckGenerations || stuckGenerations.length === 0) {
      console.log('✅ No stuck generations found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No stuck generations found',
          checked_at: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${stuckGenerations.length} stuck generation(s), attempting recovery...`);

    const results = {
      total: stuckGenerations.length,
      recovered: 0,
      still_processing: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each stuck generation
    for (const gen of stuckGenerations) {
      try {
        console.log(`🔍 Checking generation ${gen.id} (${gen.provider_task_id})`);
        
        const { data, error } = await supabase.functions.invoke('poll-kie-status', {
          body: { generation_id: gen.id }
        });

        if (error) {
          console.error(`❌ Error polling ${gen.id}:`, error);
          results.errors.push(`${gen.id}: ${error.message}`);
          results.failed++;
          continue;
        }

        if (data?.status === 'completed') {
          console.log(`✅ Recovered ${gen.id}`);
          results.recovered++;
        } else if (data?.status === 'processing') {
          console.log(`⏳ ${gen.id} still processing`);
          results.still_processing++;
        } else {
          console.log(`❌ ${gen.id} failed`);
          results.failed++;
        }
      } catch (err: any) {
        console.error(`Error processing ${gen.id}:`, err);
        results.errors.push(`${gen.id}: ${err.message}`);
        results.failed++;
      }
    }

    console.log('📊 Recovery results:', results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        checked_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Auto-recovery error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
