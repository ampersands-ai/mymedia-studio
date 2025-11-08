import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlowStep {
  step_name: string;
  step_number: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  data: Record<string, any>;
  error: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { modelRecordId, testConfig } = await req.json();

    if (!modelRecordId) {
      throw new Error('modelRecordId is required');
    }

    // Fetch model details
    const { data: model, error: modelError } = await supabaseClient
      .from('ai_models')
      .select('*')
      .eq('record_id', modelRecordId)
      .single();

    if (modelError || !model) {
      throw new Error(`Model not found: ${modelError?.message}`);
    }

    // Get or create test config
    let config = testConfig;
    if (!config) {
      const { data: savedConfig } = await supabaseClient
        .from('model_test_configs')
        .select('*')
        .eq('model_record_id', modelRecordId)
        .single();
      
      config = savedConfig || {
        prompt_template: 'A beautiful sunset over mountains',
        custom_parameters: {},
        deduct_credits: false,
        timeout_seconds: 120,
      };
    }

    const testStartTime = new Date().toISOString();
    const flowSteps: FlowStep[] = [];
    let testResultId: string | null = null;

    // Helper to add flow step
    const addStep = (stepName: string, stepNumber: number, data: any = {}, error: string | null = null) => {
      const now = new Date().toISOString();
      const lastStep = flowSteps[flowSteps.length - 1];
      const startedAt = lastStep?.completed_at || testStartTime;
      
      const step: FlowStep = {
        step_name: stepName,
        step_number: stepNumber,
        started_at: startedAt,
        completed_at: now,
        duration_ms: new Date(now).getTime() - new Date(startedAt).getTime(),
        status: error ? 'failed' : 'completed',
        data,
        error,
      };
      
      flowSteps.push(step);
      return step;
    };

    try {
      // Create test result record
      const { data: testResult, error: createError } = await supabaseClient
        .from('model_test_results')
        .insert({
          model_record_id: modelRecordId,
          test_started_at: testStartTime,
          test_prompt: config.prompt_template,
          test_parameters: config.custom_parameters || {},
          test_user_id: config.test_user_id,
          status: 'running',
          credits_required: model.base_token_cost,
        })
        .select()
        .single();

      if (createError) throw createError;
      testResultId = testResult.id;

      // Step 1: Input Validation
      const step1Start = Date.now();
      addStep('Input Validation', 1, {
        prompt: config.prompt_template,
        parameters: config.custom_parameters,
      });
      const step1Duration = Date.now() - step1Start;

      // Step 2: Credit Check
      const step2Start = Date.now();
      const testUserId = config.test_user_id || Deno.env.get('TEST_USER_ID');
      
      let creditsAvailable = 999999; // Default for test mode
      if (config.deduct_credits && testUserId) {
        const { data: subscription } = await supabaseClient
          .from('user_subscriptions')
          .select('tokens_remaining')
          .eq('user_id', testUserId)
          .single();
        
        creditsAvailable = subscription?.tokens_remaining || 0;
      }

      addStep('Credit Check', 2, {
        credits_required: model.base_token_cost,
        credits_available: creditsAvailable,
        will_deduct: config.deduct_credits,
      });
      const step2Duration = Date.now() - step2Start;

      // Step 3: Credit Deduction
      const step3Start = Date.now();
      let creditsDeducted = false;
      
      if (config.deduct_credits && testUserId) {
        const { error: deductError } = await supabaseClient.rpc('increment_tokens', {
          user_id_param: testUserId,
          amount: -model.base_token_cost,
        });
        
        if (deductError) {
          addStep('Credit Deduction', 3, {}, `Failed to deduct credits: ${deductError.message}`);
          throw new Error('Credit deduction failed');
        }
        creditsDeducted = true;
      }

      addStep('Credit Deduction', 3, {
        deducted: creditsDeducted,
        amount: config.deduct_credits ? model.base_token_cost : 0,
      });
      const step3Duration = Date.now() - step3Start;

      // Step 4: Generation Submission
      const step4Start = Date.now();
      const { data: generation, error: genError } = await supabaseClient
        .from('generations')
        .insert({
          user_id: testUserId || Deno.env.get('ADMIN_USER_ID'),
          model_id: model.id,
          model_record_id: model.record_id,
          type: model.content_type,
          prompt: config.prompt_template,
          tokens_used: model.base_token_cost,
          status: 'pending',
          settings: config.custom_parameters,
        })
        .select()
        .single();

      if (genError) {
        addStep('Generation Submission', 4, {}, `Failed to create generation: ${genError.message}`);
        throw new Error('Generation submission failed');
      }

      addStep('Generation Submission', 4, {
        generation_id: generation.id,
        provider: model.provider,
      });
      const step4Duration = Date.now() - step4Start;

      // Step 5: Call generation function (sync for Runware, async for others)
      const step5Start = Date.now();
      let outputUrl: string | null = null;
      let generationStatus = 'pending';

      if (model.provider === 'runware') {
        // Sync generation via generate-content-sync
        const { data: syncResult, error: syncError } = await supabaseClient.functions.invoke(
          'generate-content-sync',
          {
            body: {
              model_id: model.id,
              prompt: config.prompt_template,
              custom_parameters: config.custom_parameters || {},
            },
          }
        );

        if (syncError || !syncResult) {
          addStep('Generation Execution', 5, {}, `Generation failed: ${syncError?.message || 'Unknown error'}`);
          generationStatus = 'failed';
        } else {
          outputUrl = syncResult.output_url;
          generationStatus = 'completed';
          addStep('Generation Execution', 5, {
            output_url: outputUrl,
            provider_response: syncResult,
          });
        }
      } else {
        // Async generation via generate-content
        const { error: asyncError } = await supabaseClient.functions.invoke(
          'generate-content',
          {
            body: {
              generation_id: generation.id,
              model_id: model.id,
              prompt: config.prompt_template,
              custom_parameters: config.custom_parameters || {},
            },
          }
        );

        if (asyncError) {
          addStep('Generation Execution', 5, {}, `Generation failed: ${asyncError.message}`);
          generationStatus = 'failed';
        } else {
          // Poll for completion
          const pollStart = Date.now();
          const timeoutMs = (config.timeout_seconds || 120) * 1000;
          
          while (Date.now() - pollStart < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const { data: updatedGen } = await supabaseClient
              .from('generations')
              .select('status, output_url')
              .eq('id', generation.id)
              .single();

            if (updatedGen?.status === 'completed') {
              outputUrl = updatedGen.output_url;
              generationStatus = 'completed';
              addStep('Generation Execution', 5, {
                output_url: outputUrl,
                polling_duration_ms: Date.now() - pollStart,
              });
              break;
            } else if (updatedGen?.status === 'failed') {
              generationStatus = 'failed';
              addStep('Generation Execution', 5, {}, 'Generation failed');
              break;
            }
          }

          if (generationStatus === 'pending') {
            generationStatus = 'timeout';
            addStep('Generation Execution', 5, {}, `Timeout after ${config.timeout_seconds}s`);
          }
        }
      }

      const step5Duration = Date.now() - step5Start;

      // Step 6: Output Validation
      const step6Start = Date.now();
      if (outputUrl && config.validate_file_accessible) {
        try {
          const response = await fetch(outputUrl, { method: 'HEAD' });
          if (!response.ok) {
            addStep('Output Validation', 6, {}, `File not accessible: ${response.status}`);
          } else {
            addStep('Output Validation', 6, {
              url: outputUrl,
              accessible: true,
              content_type: response.headers.get('content-type'),
            });
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Unknown error';
          addStep('Output Validation', 6, {}, `Validation error: ${errorMsg}`);
        }
      } else {
        addStep('Output Validation', 6, { skipped: !outputUrl || !config.validate_file_accessible });
      }
      const step6Duration = Date.now() - step6Start;

      // Calculate total latency
      const totalLatency = Date.now() - new Date(testStartTime).getTime();

      // Update test result
      await supabaseClient
        .from('model_test_results')
        .update({
          test_completed_at: new Date().toISOString(),
          status: generationStatus === 'completed' ? 'success' : generationStatus === 'timeout' ? 'timeout' : 'failed',
          generation_id: generation.id,
          output_url: outputUrl,
          flow_steps: flowSteps,
          total_latency_ms: totalLatency,
          credit_check_ms: step2Duration,
          credit_deduct_ms: step3Duration,
          generation_submit_ms: step4Duration,
          polling_duration_ms: step5Duration,
          output_receive_ms: step6Duration,
          credits_available_before: creditsAvailable,
          credits_deducted: creditsDeducted,
          credits_refunded: false,
        })
        .eq('id', testResultId);

      return new Response(
        JSON.stringify({
          success: generationStatus === 'completed',
          testResultId,
          generationId: generation.id,
          outputUrl,
          status: generationStatus,
          flowSteps,
          timing: {
            total: totalLatency,
            credit_check: step2Duration,
            credit_deduct: step3Duration,
            generation_submit: step4Duration,
            polling: step5Duration,
            output_receive: step6Duration,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Test execution error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Update test result with error
      if (testResultId) {
        await supabaseClient
          .from('model_test_results')
          .update({
            test_completed_at: new Date().toISOString(),
            status: 'error',
            error_code: 'TEST_EXECUTION_ERROR',
            error_message: errorMessage,
            error_stack: errorStack || null,
            flow_steps: flowSteps,
          })
          .eq('id', testResultId);
      }

      throw error;
    }

  } catch (error) {
    console.error('Function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
