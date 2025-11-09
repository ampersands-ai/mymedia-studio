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
  substatus?: 'preparing' | 'executing' | 'completed' | 'failed';
  hover_data?: {
    title: string;
    details: Record<string, any>;
    preview_url?: string;
  };
  progress_percent?: number;
  retryable?: boolean;
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
    let apiRequestPayload: any = null;
    let apiFirstResponse: any = null;
    let apiFinalResponse: any = null;
    let storageMetadata: any = null;

    // Helper to add flow step with enhanced tracking
    const addStep = (
      stepName: string, 
      stepNumber: number, 
      data: any = {}, 
      error: string | null = null,
      hoverData?: { title: string; details: Record<string, any>; preview_url?: string }
    ) => {
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
        hover_data: hoverData,
        substatus: error ? 'failed' : 'completed',
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

      // Step 1: User Input Validation
      const step1Start = Date.now();
      addStep('User Input Validation', 1, {
        prompt: config.prompt_template,
        parameters: config.custom_parameters,
        model_id: model.id,
      }, null, {
        title: 'Input Validation Details',
        details: {
          prompt: config.prompt_template,
          custom_parameters: JSON.stringify(config.custom_parameters, null, 2),
          model_name: model.model_name,
          provider: model.provider,
          content_type: model.content_type,
        },
      });
      const step1Duration = Date.now() - step1Start;

      // Step 2: Credit Check
      const step2Start = Date.now();
      let testUserId = config.test_user_id || Deno.env.get('TEST_USER_ID');
      
      // If no test user configured, find an admin user
      if (!testUserId) {
        const { data: adminUser } = await supabaseClient
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .single();
        
        testUserId = adminUser?.user_id;
      }
      
      // If still no user, find any user with subscription
      if (!testUserId) {
        const { data: anyUser } = await supabaseClient
          .from('user_subscriptions')
          .select('user_id')
          .limit(1)
          .single();
        
        testUserId = anyUser?.user_id;
      }
      
      if (!testUserId) {
        throw new Error('No valid user found for test execution');
      }
      
      let creditsAvailable = 999999; // Default for test mode
      if (config.deduct_credits) {
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
        test_user_id: testUserId,
      }, null, {
        title: 'Credit Check Details',
        details: {
          credits_required: model.base_token_cost,
          credits_available: creditsAvailable,
          deduction_mode: config.deduct_credits ? 'Live' : 'Test',
          user_id: testUserId || 'N/A',
          balance_after: creditsAvailable - (config.deduct_credits ? model.base_token_cost : 0),
        },
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

      addStep(creditsDeducted ? 'Credits Deducted' : 'Credit Deduction Skipped', 3, {
        deducted: creditsDeducted,
        amount: config.deduct_credits ? model.base_token_cost : 0,
      }, null, {
        title: creditsDeducted ? 'Credits Deducted' : 'Test Mode - No Deduction',
        details: {
          amount_deducted: creditsDeducted ? model.base_token_cost : 0,
          mode: config.deduct_credits ? 'Live' : 'Test',
          transaction_type: 'Model Health Test',
        },
      });
      const step3Duration = Date.now() - step3Start;

      // Step 4: API Request Preparation
      const step4Start = Date.now();
      let outputUrl: string | null = null;
      let generationStatus = 'pending';
      let generationId: string | null = null;
      
      // Use service role key for authentication in test mode
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      // Prepare API request payload
      apiRequestPayload = {
        model_record_id: model.record_id,
        prompt: config.prompt_template,
        custom_parameters: config.custom_parameters || {},
        user_id: testUserId,
      };

      addStep('API Request Prepared', 4, {
        endpoint: model.provider === 'runware' ? 'generate-content-sync' : 'generate-content',
        method: 'POST',
      }, null, {
        title: 'API Request Details',
        details: {
          endpoint: `${model.provider === 'runware' ? 'generate-content-sync' : 'generate-content'}`,
          payload: JSON.stringify(apiRequestPayload, null, 2),
          provider: model.provider,
          model_id: model.id,
        },
      });

      // Step 5: Send API Request
      const step5Start = Date.now();
      
      if (model.provider === 'runware') {
        // Sync generation via generate-content-sync
        addStep('API Request Sent', 5, {
          provider: 'runware',
          sync: true,
        });
        
        const syncResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-content-sync`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiRequestPayload),
          }
        );

        if (!syncResponse.ok) {
          const errorText = await syncResponse.text();
          let parsedError: any;
          try {
            parsedError = JSON.parse(errorText);
          } catch {
            parsedError = { error: errorText };
          }
          
          console.error('Sync generation failed:', syncResponse.status, errorText);
          apiFirstResponse = parsedError;
          apiFinalResponse = parsedError;
          
          // Provide friendly message for duplicate model IDs
          let errorMessage = `Generation failed: HTTP ${syncResponse.status}`;
          if (parsedError.error?.includes('Duplicate model') || parsedError.error?.includes('multiple rows')) {
            errorMessage = `Multiple active models share id "${model.id}". Test now uses model_record_id — please ensure ai_models table has unique id values.`;
          } else if (parsedError.error) {
            errorMessage += ` - ${parsedError.error.substring(0, 200)}`;
          }
          
          addStep('API Response Received', 6, { 
            error_status: syncResponse.status,
            error_body: parsedError 
          }, errorMessage, {
            title: 'API Error Response',
            details: {
              status_code: syncResponse.status,
              error_message: parsedError.error || 'Unknown error',
              full_response: JSON.stringify(parsedError, null, 2),
            },
          });
          generationStatus = 'failed';
        } else {
          const syncResult = await syncResponse.json();
          generationId = syncResult.id;
          outputUrl = syncResult.output_url;
          generationStatus = 'completed';
          apiFirstResponse = syncResult;
          apiFinalResponse = syncResult;
          
          addStep('Final Response Received', 6, {
            generation_id: generationId,
            output_url: outputUrl,
            status: 'completed',
          }, null, {
            title: 'Generation Complete',
            details: {
              generation_id: generationId,
              output_url: outputUrl,
              provider_task_id: syncResult.provider_task_id || 'N/A',
              response: JSON.stringify(syncResult, null, 2),
            },
            preview_url: outputUrl || undefined,
          });

          // Step 7: Media Storage (implicit for sync)
          storageMetadata = {
            bucket: 'generated-content',
            output_url: outputUrl,
            generation_id: generationId,
          };
          
          addStep('Media Stored on Supabase', 7, {
            url: outputUrl,
            accessible: true,
          }, null, {
            title: 'Storage Details',
            details: {
              bucket: 'generated-content',
              public_url: outputUrl,
              generation_id: generationId,
            },
          });
        }
      } else {
        // Async generation via generate-content
        addStep('API Request Sent', 5, {
          provider: model.provider,
          sync: false,
        });
        
        const asyncResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-content`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiRequestPayload),
          }
        );

        if (!asyncResponse.ok) {
          const errorText = await asyncResponse.text();
          let parsedError: any;
          try {
            parsedError = JSON.parse(errorText);
          } catch {
            parsedError = { error: errorText };
          }
          
          console.error('Async generation failed:', asyncResponse.status, errorText);
          apiFirstResponse = parsedError;
          apiFinalResponse = parsedError;
          
          // Provide friendly message for duplicate model IDs
          let errorMessage = `Generation failed: HTTP ${asyncResponse.status}`;
          if (parsedError.error?.includes('Duplicate model') || parsedError.error?.includes('multiple rows')) {
            errorMessage = `Multiple active models share id "${model.id}". Test now uses model_record_id — please ensure ai_models table has unique id values.`;
          } else if (parsedError.error) {
            errorMessage += ` - ${parsedError.error.substring(0, 200)}`;
          }
          
          addStep('First Response Received', 6, { 
            error_status: asyncResponse.status,
            error_body: parsedError 
          }, errorMessage, {
            title: 'API Error Response',
            details: {
              status_code: asyncResponse.status,
              error_message: parsedError.error || 'Unknown error',
              full_response: JSON.stringify(parsedError, null, 2),
            },
          });
          generationStatus = 'failed';
        } else {
          // Get generation_id from response
          const asyncResult = await asyncResponse.json();
          generationId = asyncResult.id;
          apiFirstResponse = asyncResult;
          
          addStep('First Response Received', 6, {
            generation_id: generationId,
            provider: model.provider,
            provider_task_id: asyncResult.provider_task_id || 'Pending',
          }, null, {
            title: 'Generation Submitted',
            details: {
              generation_id: generationId,
              provider: model.provider,
              provider_task_id: asyncResult.provider_task_id || 'Pending',
              status: 'Queued',
            },
          });
          
          // Step 7: Poll for completion
          const pollStart = Date.now();
          const timeoutMs = (config.timeout_seconds || 120) * 1000;
          let pollCount = 0;
          
          addStep('Polling for Completion', 7, {
            timeout_seconds: config.timeout_seconds,
          }, null, {
            title: 'Waiting for Provider',
            details: {
              provider: model.provider,
              max_wait_time: `${config.timeout_seconds}s`,
              poll_interval: '2s',
            },
          });
          
          while (Date.now() - pollStart < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            pollCount++;
            
            const { data: updatedGen } = await supabaseClient
              .from('generations')
              .select('status, output_url, provider_response')
              .eq('id', generationId)
              .single();

            if (updatedGen?.status === 'completed') {
              outputUrl = updatedGen.output_url;
              generationStatus = 'completed';
              apiFinalResponse = updatedGen.provider_response || updatedGen;
              
              addStep('Final Response Received', 8, {
                output_url: outputUrl,
                polling_duration_ms: Date.now() - pollStart,
                poll_count: pollCount,
              }, null, {
                title: 'Generation Complete',
                details: {
                  output_url: outputUrl,
                  total_wait_time: `${((Date.now() - pollStart) / 1000).toFixed(2)}s`,
                  poll_attempts: pollCount,
                  final_status: 'completed',
                },
                preview_url: outputUrl || undefined,
              });

              // Step 9: Media Storage
              storageMetadata = {
                bucket: 'generated-content',
                output_url: outputUrl,
                generation_id: generationId,
              };
              
              addStep('Media Stored on Supabase', 9, {
                url: outputUrl,
                accessible: true,
              }, null, {
                title: 'Storage Details',
                details: {
                  bucket: 'generated-content',
                  public_url: outputUrl,
                  generation_id: generationId,
                },
              });
              break;
            } else if (updatedGen?.status === 'failed') {
              generationStatus = 'failed';
              apiFinalResponse = updatedGen.provider_response || updatedGen;
              addStep('Final Response Received', 8, {
                polling_duration_ms: Date.now() - pollStart,
              }, 'Generation failed', {
                title: 'Generation Failed',
                details: {
                  status: 'failed',
                  wait_time: `${((Date.now() - pollStart) / 1000).toFixed(2)}s`,
                  poll_attempts: pollCount,
                },
              });
              break;
            }
          }

          if (generationStatus === 'pending') {
            generationStatus = 'timeout';
            addStep('Final Response Received', 8, {
              polling_duration_ms: Date.now() - pollStart,
            }, `Timeout after ${config.timeout_seconds}s`, {
              title: 'Timeout',
              details: {
                max_wait_time: `${config.timeout_seconds}s`,
                poll_attempts: pollCount,
                last_status: 'pending',
              },
            });
          }
        }
      }

      const step4Duration = Date.now() - step4Start;

      // Step 10: Media Validation & Delivery
      const step10Start = Date.now();
      const nextStepNum = flowSteps.length + 1;
      
      if (outputUrl && config.validate_file_accessible) {
        try {
          const response = await fetch(outputUrl, { method: 'HEAD' });
          const contentType = response.headers.get('content-type');
          const contentLength = response.headers.get('content-length');
          
          if (!response.ok) {
            addStep('Media Validation', nextStepNum, {}, `File not accessible: ${response.status}`, {
              title: 'Validation Failed',
              details: {
                url: outputUrl,
                status_code: response.status,
                accessible: false,
              },
            });
          } else {
            addStep('Media Delivered to User', nextStepNum, {
              url: outputUrl,
              accessible: true,
              content_type: contentType,
              size_bytes: contentLength,
            }, null, {
              title: 'Media Ready',
              details: {
                public_url: outputUrl,
                content_type: contentType || 'N/A',
                file_size: contentLength ? `${(parseInt(contentLength) / 1024).toFixed(2)} KB` : 'N/A',
                accessible: true,
                validated: true,
              },
              preview_url: outputUrl,
            });
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Unknown error';
          addStep('Media Validation', nextStepNum, {}, `Validation error: ${errorMsg}`, {
            title: 'Validation Error',
            details: {
              error: errorMsg,
              url: outputUrl,
            },
          });
        }
      } else if (!outputUrl) {
        addStep('Media Validation Skipped', nextStepNum, { 
          reason: 'No output URL available' 
        });
      } else {
        addStep('Media Validation Skipped', nextStepNum, { 
          reason: 'Validation disabled in config' 
        });
      }
      const step10Duration = Date.now() - step10Start;

      // Calculate total latency
      const totalLatency = Date.now() - new Date(testStartTime).getTime();

      // Update test result with enhanced tracking data
      await supabaseClient
        .from('model_test_results')
        .update({
          test_completed_at: new Date().toISOString(),
          status: generationStatus === 'completed' ? 'success' : generationStatus === 'timeout' ? 'timeout' : 'failed',
          generation_id: generationId,
          output_url: outputUrl,
          media_preview_url: outputUrl, // Use output URL as preview for now
          flow_steps: flowSteps,
          total_latency_ms: totalLatency,
          credit_check_ms: step2Duration,
          credit_deduct_ms: step3Duration,
          generation_submit_ms: step4Duration,
          polling_duration_ms: step4Duration,
          output_receive_ms: step10Duration,
          credits_available_before: creditsAvailable,
          credits_deducted: creditsDeducted,
          credits_refunded: false,
          api_request_payload: apiRequestPayload,
          api_first_response: apiFirstResponse,
          api_final_response: apiFinalResponse,
          storage_metadata: storageMetadata,
        })
        .eq('id', testResultId);

      return new Response(
        JSON.stringify({
          success: generationStatus === 'completed',
          testResultId,
          generationId: generationId,
          outputUrl,
          status: generationStatus,
          flowSteps,
          timing: {
            total: totalLatency,
            credit_check: step2Duration,
            credit_deduct: step3Duration,
            generation_submit: step4Duration,
            polling: step4Duration,
            output_receive: step10Duration,
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
