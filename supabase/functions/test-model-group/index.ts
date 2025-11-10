import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  model_id: string;
  model_name: string;
  status: 'success' | 'failed' | 'error';
  latency_ms?: number;
  error_message?: string;
  output_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roles || roles.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { group } = await req.json();

    // Get all models in the specified group
    const { data: models, error: modelsError } = await supabase
      .from('ai_models')
      .select('*')
      .eq('is_active', true);

    if (modelsError) throw modelsError;

    // Filter models by group
    const groupModels = models.filter(model => {
      const groups = model.groups as any[] || [];
      return groups.includes(group);
    });

    console.log(`Found ${groupModels.length} models in group: ${group}`);

    const results: TestResult[] = [];
    const testPrompt = "A serene mountain landscape at sunset with vibrant colors";

    // Test each model
    for (const model of groupModels) {
      console.log(`Testing model: ${model.model_name}`);
      
      const testStartTime = Date.now();
      
      try {
        // Create test record
        const { data: testRecord, error: insertError } = await supabase
          .from('model_test_results')
          .insert({
            model_record_id: model.record_id,
            test_prompt: testPrompt,
            status: 'running',
            test_parameters: {
              width: 1024,
              height: 1024,
              num_outputs: 1,
            },
            test_user_id: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Call async generate-content with test_mode flag (SAME as production)
        const { data: generateData, error: generateError } = await supabase.functions.invoke('generate-content', {
          body: {
            model_record_id: model.record_id,
            prompt: testPrompt,
            custom_parameters: {
              width: 1024,
              height: 1024,
              num_outputs: 1,
            },
            user_id: user.id,
            test_mode: true, // Mark as non-billable admin test
          },
        });

        if (generateError) throw generateError;

        const generationId = generateData.generation_id;

        // Poll for completion (SAME as production)
        let attempts = 0;
        const maxAttempts = 120; // 10 minutes max (5s intervals)
        let generationStatus = 'processing';
        let outputUrl = null;
        let providerError = null;

        while (attempts < maxAttempts && generationStatus === 'processing') {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5s interval
          
          const { data: genData } = await supabase
            .from('generations')
            .select('status, storage_path, provider_response')
            .eq('id', generationId)
            .single();
          
          if (genData) {
            generationStatus = genData.status;
            outputUrl = genData.storage_path;
            
            if (genData.status === 'failed' && genData.provider_response) {
              providerError = (genData.provider_response as any)?.error || 'Generation failed';
            }
          }
          
          attempts++;
        }

        const latency = Date.now() - testStartTime;

        if (generationStatus === 'completed') {
          // Success - update test record
          await supabase
            .from('model_test_results')
            .update({
              status: 'completed',
              test_completed_at: new Date().toISOString(),
              total_latency_ms: latency,
              output_url: outputUrl,
              generation_id: generationId,
            })
            .eq('id', testRecord.id);

          results.push({
            model_id: model.id,
            model_name: model.model_name,
            status: 'success',
            latency_ms: latency,
            output_url: outputUrl,
          });

          console.log(`✓ ${model.model_name}: SUCCESS (${latency}ms)`);
        } else {
          // Failed or timeout
          throw new Error(providerError || `Timeout after ${attempts * 5}s`);
        }
      } catch (error) {
        const latency = Date.now() - testStartTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        results.push({
          model_id: model.id,
          model_name: model.model_name,
          status: 'failed',
          latency_ms: latency,
          error_message: errorMessage,
        });

        console.log(`✗ ${model.model_name}: FAILED - ${errorMessage}`);
      }
    }

    // Generate summary
    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      average_latency: Math.round(
        results.filter(r => r.latency_ms).reduce((sum, r) => sum + (r.latency_ms || 0), 0) / results.length
      ),
    };

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error testing model group:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
