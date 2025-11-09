import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestStep {
  step: string;
  timestamp: number;
  data: any;
  status: 'success' | 'error' | 'pending';
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { modelRecordId, prompt, parameters, userId, imageUrls } = await req.json();
    
    const steps: TestStep[] = [];
    const testStartTime = Date.now();

    // Step 1: User Input Validation
    console.log('Step 1: Validating user input...');
    const inputValidationStep: TestStep = {
      step: 'input_validation',
      timestamp: Date.now(),
      status: 'success',
      data: {
        prompt,
        prompt_length: prompt?.length || 0,
        custom_parameters: parameters || {},
        model_record_id: modelRecordId,
        has_images: imageUrls && imageUrls.length > 0,
        image_count: imageUrls?.length || 0,
      }
    };
    
    if (!prompt || prompt.trim().length === 0) {
      inputValidationStep.status = 'error';
      inputValidationStep.error = 'Prompt is required';
      steps.push(inputValidationStep);
      throw new Error('Prompt validation failed');
    }
    
    steps.push(inputValidationStep);

    // Get model details
    const { data: model, error: modelError } = await supabase
      .from('ai_models')
      .select('*')
      .eq('record_id', modelRecordId)
      .single();

    if (modelError || !model) {
      throw new Error(`Model not found: ${modelError?.message}`);
    }

    // Step 2: Credit Check
    console.log('Step 2: Checking credits...');
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('tokens_remaining, tokens_total')
      .eq('user_id', userId)
      .single();

    const creditsRequired = model.base_token_cost || 2;
    const creditsAvailable = subscription?.tokens_remaining || 0;
    
    steps.push({
      step: 'credit_check',
      timestamp: Date.now(),
      status: 'success',
      data: {
        credits_required: creditsRequired,
        credits_available: creditsAvailable,
        will_deduct: true,
        user_id: userId,
        sufficient_balance: creditsAvailable >= creditsRequired,
      }
    });

    // Step 3: Credit Deduction (for testing, we'll simulate or skip)
    console.log('Step 3: Credit deduction (test mode - skipped)...');
    steps.push({
      step: 'credit_deduction',
      timestamp: Date.now(),
      status: 'success',
      data: {
        deducted: false,
        amount: 0,
        new_balance: creditsAvailable,
        test_mode: true,
        note: 'Credits not deducted in test mode'
      }
    });

    // Step 4: API Request Prepared
    console.log('Step 4: Preparing API request...');
    const apiPayload = {
      model_id: model.id,
      prompt: prompt,
      ...parameters,
    };

    if (imageUrls && imageUrls.length > 0) {
      apiPayload.image_urls = imageUrls;
    }

    steps.push({
      step: 'api_request_prepared',
      timestamp: Date.now(),
      status: 'success',
      data: {
        payload: apiPayload,
        endpoint: model.api_endpoint || 'default',
        provider: model.provider,
        content_type: model.content_type,
      }
    });

    // Step 5: API Request Sent
    console.log('Step 5: Sending API request...');
    const requestSentTime = Date.now();
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    steps.push({
      step: 'api_request_sent',
      timestamp: requestSentTime,
      status: 'success',
      data: {
        timestamp: requestSentTime,
        provider_endpoint: model.api_endpoint,
        http_method: 'POST',
        auth_type: 'Bearer Token',
      }
    });

    // Call the actual generation API
    const generateResponse = await fetch('https://ai.gateway.lovable.dev/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_id: model.id,
        prompt: prompt,
        parameters: parameters || {},
        image_urls: imageUrls || [],
      }),
    });

    // Step 6: First API Response Received
    console.log('Step 6: Received first API response...');
    const firstResponseTime = Date.now();
    
    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      steps.push({
        step: 'first_api_response',
        timestamp: firstResponseTime,
        status: 'error',
        error: `API error: ${generateResponse.status} - ${errorText}`,
        data: {
          status_code: generateResponse.status,
          latency_ms: firstResponseTime - requestSentTime,
        }
      });
      throw new Error(`Generation API failed: ${errorText}`);
    }

    const generateResult = await generateResponse.json();
    const taskId = generateResult.task_id || generateResult.id;

    steps.push({
      step: 'first_api_response',
      timestamp: firstResponseTime,
      status: 'success',
      data: {
        status_code: generateResponse.status,
        provider_task_id: taskId,
        estimated_time: model.estimated_time_seconds || 30,
        latency_ms: firstResponseTime - requestSentTime,
        initial_status: generateResult.status || 'pending',
      }
    });

    // Step 7: Generation Polling (if async)
    console.log('Step 7: Starting polling...');
    let pollCount = 0;
    let finalResult = null;
    const maxPolls = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds

    const pollingStartTime = Date.now();
    
    while (pollCount < maxPolls) {
      pollCount++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      // Check generation status via Supabase
      const { data: generation } = await supabase
        .from('generations')
        .select('*')
        .eq('provider_task_id', taskId)
        .single();

      if (generation && generation.status === 'completed') {
        finalResult = generation;
        break;
      }
      
      if (generation && generation.status === 'failed') {
        throw new Error('Generation failed');
      }

      console.log(`Poll ${pollCount}: Status = ${generation?.status || 'pending'}`);
    }

    const pollingEndTime = Date.now();

    steps.push({
      step: 'generation_polling',
      timestamp: pollingEndTime,
      status: 'success',
      data: {
        poll_count: pollCount,
        time_elapsed_ms: pollingEndTime - pollingStartTime,
        current_status: finalResult?.status || 'timeout',
        polling_intervals_ms: pollInterval,
      }
    });

    if (!finalResult) {
      throw new Error('Generation timeout');
    }

    // Step 8: Final API Response Received
    console.log('Step 8: Final response received...');
    steps.push({
      step: 'final_api_response',
      timestamp: Date.now(),
      status: 'success',
      data: {
        completion_status: finalResult.status,
        output_url: finalResult.output_url,
        storage_path: finalResult.storage_path,
        provider_metadata: finalResult.provider_response || {},
        total_generation_time_ms: Date.now() - requestSentTime,
      }
    });

    // Step 9: Media Storage Operation
    console.log('Step 9: Media storage...');
    steps.push({
      step: 'media_storage',
      timestamp: Date.now(),
      status: 'success',
      data: {
        storage_bucket: 'generated-content',
        file_path: finalResult.storage_path,
        file_size_bytes: finalResult.file_size_bytes || 0,
        mime_type: `${model.content_type}/*`,
      }
    });

    // Step 10: Media Validation
    console.log('Step 10: Validating media...');
    const validationStartTime = Date.now();
    let mediaAccessible = false;
    
    if (finalResult.output_url) {
      try {
        const headResponse = await fetch(finalResult.output_url, { method: 'HEAD' });
        mediaAccessible = headResponse.ok;
        
        steps.push({
          step: 'media_validation',
          timestamp: Date.now(),
          status: 'success',
          data: {
            accessibility_check: mediaAccessible,
            status_code: headResponse.status,
            content_type: headResponse.headers.get('content-type'),
            content_length: headResponse.headers.get('content-length'),
            validation_time_ms: Date.now() - validationStartTime,
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        steps.push({
          step: 'media_validation',
          timestamp: Date.now(),
          status: 'error',
          error: errorMessage,
          data: {
            accessibility_check: false,
          }
        });
      }
    }

    // Step 11: Media Delivered to User
    console.log('Step 11: Delivering media to user...');
    steps.push({
      step: 'media_delivered',
      timestamp: Date.now(),
      status: 'success',
      data: {
        final_url: finalResult.output_url,
        delivery_time_ms: Date.now() - testStartTime,
        validation_success: mediaAccessible,
        generation_id: finalResult.id,
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_time_ms: Date.now() - testStartTime,
        steps,
        generation_id: finalResult.id,
        output_url: finalResult.output_url,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Test generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        steps: [],
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
