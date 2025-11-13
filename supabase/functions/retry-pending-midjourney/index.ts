import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Authenticate admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated and is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Scanning for pending Midjourney generations...');

    // Find all pending/processing Midjourney generations
    const { data: pendingGens, error: queryError } = await supabase
      .from('generations')
      .select('id, model_id, provider_task_id, created_at, user_id, model_record_id')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(50); // Process max 50 at a time

    if (queryError) {
      throw new Error(`Failed to query generations: ${queryError.message}`);
    }

    if (!pendingGens || pendingGens.length === 0) {
      console.log('✅ No pending generations found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending generations found',
          processed: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter for Midjourney models
    const midjourneyGens = pendingGens.filter(gen => {
      const modelId = gen.model_id || '';
      return modelId && (modelId.startsWith('mj_') || modelId.includes('midjourney'));
    });

    console.log(`📊 Found ${pendingGens.length} pending generations, ${midjourneyGens.length} are Midjourney`);

    if (midjourneyGens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending Midjourney generations found',
          total_pending: pendingGens.length,
          midjourney_pending: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      total: midjourneyGens.length,
      processed: 0,
      completed: 0,
      still_processing: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Process each Midjourney generation
    for (const gen of midjourneyGens) {
      try {
        console.log(`\n🎨 [${gen.id}] Processing Midjourney generation...`);
        console.log(`   Model: ${gen.model_id}`);
        console.log(`   Task ID: ${gen.provider_task_id || 'missing'}`);
        console.log(`   Created: ${gen.created_at}`);

        if (!gen.provider_task_id) {
          console.warn(`⚠️  [${gen.id}] Skipping - no provider_task_id`);
          results.errors.push({
            generation_id: gen.id,
            error: 'No provider_task_id found'
          });
          continue;
        }

        // Call poll-kie-status to check and fix if complete
        const pollResponse = await fetch(`${supabaseUrl}/functions/v1/poll-kie-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            generation_id: gen.id
          })
        });

        const pollResult = await pollResponse.json();
        results.processed++;

        if (pollResult.success) {
          if (pollResult.status === 'completed' && pollResult.result_urls?.length > 0) {
            console.log(`✅ [${gen.id}] Task completed! Found ${pollResult.result_urls.length} results`);
            results.completed++;
          } else {
            console.log(`⏳ [${gen.id}] Task still ${pollResult.status}`);
            results.still_processing++;
          }
        } else {
          console.error(`❌ [${gen.id}] Poll failed:`, pollResult.error);
          results.failed++;
          results.errors.push({
            generation_id: gen.id,
            error: pollResult.error
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`❌ [${gen.id}] Error:`, error.message);
        results.failed++;
        results.errors.push({
          generation_id: gen.id,
          error: error.message
        });
      }
    }

    console.log('\n📊 Processing complete!');
    console.log('   Total processed:', results.processed);
    console.log('   Completed:', results.completed);
    console.log('   Still processing:', results.still_processing);
    console.log('   Failed:', results.failed);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.processed} Midjourney generations`,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Retry pending Midjourney error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
