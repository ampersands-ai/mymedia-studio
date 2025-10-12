import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callProvider } from "./providers/index.ts";
import { calculateTokenCost } from "./utils/token-calculator.ts";
import { uploadToStorage } from "./utils/storage.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phase 3: Request queuing and circuit breaker
const CONCURRENT_LIMIT = 100;
const activeRequests = new Map<string, Promise<any>>();

const CIRCUIT_BREAKER = {
  failures: 0,
  threshold: 10,
  timeout: 60000, // 1 minute
  lastFailure: 0
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Check request queue capacity
    if (activeRequests.size >= CONCURRENT_LIMIT) {
      return new Response(
        JSON.stringify({ error: 'System at capacity. Please try again in a moment.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { 
      template_id, 
      model_id, 
      model_record_id,
      prompt, 
      custom_parameters = {},
      enhance_prompt = false,
      enhancement_provider = 'lovable_ai'
    } = await req.json();

    console.log('Generation request:', { user_id: user.id, template_id, model_id, model_record_id, enhance_prompt });

    // Validate: template_id XOR (model_id or model_record_id)
    if ((!template_id && !model_id && !model_record_id) || (template_id && (model_id || model_record_id))) {
      throw new Error('Must provide either template_id or model_id/model_record_id, not both');
    }

    let model: any;
    let template: any = null;
    let parameters: any = {};
    let enhancementInstruction: string | null = null;

    // Load configuration
    if (template_id) {
      // Template mode
      const { data: templateData, error: templateError } = await supabase
        .from('content_templates')
        .select('*, ai_models(*)')
        .eq('id', template_id)
        .eq('is_active', true)
        .single();

      if (templateError || !templateData) {
        throw new Error('Template not found or inactive');
      }

      template = templateData;
      model = templateData.ai_models;
      parameters = { ...templateData.preset_parameters, ...custom_parameters };
      enhancementInstruction = templateData.enhancement_instruction;
    } else {
      // Custom mode - support both legacy model_id and new model_record_id
      const query = supabase
        .from('ai_models')
        .select('*')
        .eq('is_active', true);
      
      // Prefer model_record_id if provided, fallback to model_id
      if (model_record_id) {
        query.eq('record_id', model_record_id);
      } else {
        query.eq('id', model_id);
      }
      
      const { data: modelData, error: modelError } = await query.single();

      if (modelError || !modelData) {
        throw new Error('Model not found or inactive');
      }

      model = modelData;
      parameters = custom_parameters;
    }

    console.log('Using model:', model.id, 'Provider:', model.provider);

    // Check if model has prompt field in schema
    const hasPromptField = Boolean(model.input_schema?.properties?.prompt);
    const promptRequired = hasPromptField && 
      Array.isArray(model.input_schema?.required) && 
      model.input_schema.required.includes('prompt');

    // Phase 4: Check generation rate limits
    const { data: userSubscription } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const userPlan = userSubscription?.plan || 'freemium';

    // Check hourly generation limit
    const hourAgo = new Date(Date.now() - 3600000);
    const { count: hourlyCount } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', hourAgo.toISOString());

    const { data: tierLimits } = await supabase
      .from('rate_limit_tiers')
      .select('*')
      .eq('tier', userPlan)
      .single();

    if (tierLimits && hourlyCount !== null && hourlyCount >= tierLimits.max_generations_per_hour) {
      return new Response(
        JSON.stringify({ 
          error: 'Hourly generation limit reached',
          limit: tierLimits.max_generations_per_hour,
          current: hourlyCount,
          reset_in_seconds: 3600 - Math.floor((Date.now() - new Date(hourAgo).getTime()) / 1000)
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check concurrent generation limit
    const { count: concurrentCount } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (tierLimits && concurrentCount !== null && concurrentCount >= tierLimits.max_concurrent_generations) {
      console.error(`Concurrent limit exceeded: ${concurrentCount}/${tierLimits.max_concurrent_generations} for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Concurrent generation limit reached. Please wait for your current generation to complete.',
          limit: tierLimits.max_concurrent_generations,
          current: concurrentCount
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields based on model's input schema
    const inputSchema = model.input_schema || {};
    if (inputSchema.image_urls && inputSchema.image_urls.required) {
      if (!parameters.image_urls || !Array.isArray(parameters.image_urls) || parameters.image_urls.length === 0) {
        return new Response(
          JSON.stringify({ error: 'image_urls is required for this model' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Enhance prompt if requested and model has prompt field
    let finalPrompt = prompt || "";
    let originalPrompt = prompt || "";
    let usedEnhancementProvider = null;

    if (hasPromptField && prompt && (enhance_prompt || enhancementInstruction)) {
      console.log('Enhancing prompt...');
      try {
        const enhancementResult = await enhancePrompt(
          prompt,
          enhancementInstruction,
          enhancement_provider,
          model.content_type
        );
        finalPrompt = enhancementResult.enhanced;
        usedEnhancementProvider = enhancementResult.provider;
        console.log('Prompt enhanced successfully');
      } catch (error) {
        console.error('Prompt enhancement failed:', error);
        // Continue with original prompt
      }
    }

    // Validate and filter parameters against schema
    function validateAndFilterParameters(
      parameters: Record<string, any>,
      schema: any
    ): Record<string, any> {
      if (!schema?.properties) return parameters;
      
      const allowedKeys = Object.keys(schema.properties);
      const filtered: Record<string, any> = {};
      
      for (const key of allowedKeys) {
        if (parameters[key] !== undefined) {
          filtered[key] = parameters[key];
        }
      }
      
      console.log('Parameters filtered from schema:', {
        original: Object.keys(parameters),
        filtered: Object.keys(filtered)
      });
      
      return filtered;
    }

let validatedParameters = validateAndFilterParameters(
      parameters,
      model.input_schema
    );

    // Coerce parameter types based on schema (e.g., "true" -> true for booleans)
    function coerceParametersBySchema(params: Record<string, any>, schema: any) {
      if (!schema?.properties) return params;
      const coerced: Record<string, any> = {};
      for (const [key, val] of Object.entries(params)) {
        const prop: any = schema.properties[key];
        if (!prop) { coerced[key] = val; continue; }
        const t = prop.type;
        if (t === 'boolean') {
          coerced[key] = typeof val === 'boolean' ? val : String(val) === 'true';
        } else if (t === 'integer') {
          const n = typeof val === 'number' ? val : parseInt(String(val), 10);
          coerced[key] = Number.isNaN(n) ? val : n;
        } else if (t === 'number') {
          const n = typeof val === 'number' ? val : parseFloat(String(val));
          coerced[key] = Number.isNaN(n) ? val : n;
        } else {
          coerced[key] = val;
        }
      }
      return coerced;
    }

    validatedParameters = coerceParametersBySchema(validatedParameters, model.input_schema);

    // Calculate token cost with validated parameters
    const tokenCost = calculateTokenCost(
      model.base_token_cost,
      model.cost_multipliers || {},
      validatedParameters
    );

    console.log('Token cost calculated:', tokenCost);

    // SECURITY FIX: Transaction-like token deduction + generation creation
    // This prevents race conditions where tokens are deducted but generation fails
    let tokensDeducted = false;
    let generationCreated = false;
    let generation: any = null;

    try {
      // Step 1: Check and deduct tokens atomically
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('tokens_remaining')
        .eq('user_id', user.id)
        .single();

      if (subError || !subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.tokens_remaining < tokenCost) {
        return new Response(
          JSON.stringify({ error: 'Insufficient tokens', required: tokenCost, available: subscription.tokens_remaining }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deduct tokens first
      const { error: deductError } = await supabase
        .from('user_subscriptions')
        .update({ tokens_remaining: subscription.tokens_remaining - tokenCost })
        .eq('user_id', user.id)
        .eq('tokens_remaining', subscription.tokens_remaining); // Optimistic locking

      if (deductError) {
        console.error('Token deduction failed:', deductError);
        throw new Error('Failed to deduct tokens - possible concurrent update');
      }

      tokensDeducted = true;
      console.log('Tokens deducted:', tokenCost);

      // Step 2: Create generation record
      const { data: gen, error: genError } = await supabase
        .from('generations')
        .insert({
          user_id: user.id,
          model_id: model.id,
          model_record_id: model.record_id,
          template_id: template_id || null,
          type: model.content_type,
          prompt: finalPrompt,
          original_prompt: originalPrompt,
          enhanced_prompt: enhance_prompt ? finalPrompt : null,
          enhancement_provider: usedEnhancementProvider,
          settings: parameters,
          tokens_used: tokenCost,
          actual_token_cost: tokenCost,
          status: 'pending',
          provider_task_id: null
        })
        .select()
        .single();

      if (genError || !gen) {
        console.error('Generation creation failed:', genError);
        throw new Error('Failed to create generation record');
      }

      generation = gen;
      generationCreated = true;
      console.log('Generation record created:', generation.id);

      // Validate prompt only if model has prompt field
      if (hasPromptField) {
        if (promptRequired && (!prompt || prompt.trim() === '')) {
          throw new Error('Prompt is required for this model');
        }
        if (prompt && (prompt.length < 3 || prompt.length > 2000)) {
          throw new Error('Prompt must be between 3 and 2000 characters');
        }
      }

      // Validate all required parameters from schema
      if (model.input_schema?.required) {
        for (const requiredParam of model.input_schema.required) {
          if (requiredParam === 'prompt') continue; // already handled above
          if (!validatedParameters[requiredParam]) {
            throw new Error(`Missing required parameter: ${requiredParam}`);
          }
        }
      }

    } catch (txError) {
      console.error('Transaction error:', txError);
      
      // If generation was created but validation failed, update status to failed
      if (generationCreated && generation) {
        await supabase
          .from('generations')
          .update({
            status: 'failed',
            provider_response: { 
              error: txError instanceof Error ? txError.message : 'Validation failed',
              full_error: txError instanceof Error ? txError.toString() : String(txError),
              timestamp: new Date().toISOString()
            }
          })
          .eq('id', generation.id);
        
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'generation_failed',
          resource_type: 'generation',
          resource_id: generation.id,
          metadata: {
            error: txError instanceof Error ? txError.message : 'Validation failed',
            model_id: model.id,
            tokens_refunded: tokenCost,
            reason: 'validation_error'
          }
        });
      }
      
      // AUTOMATIC ROLLBACK: Refund tokens if deducted
      if (tokensDeducted) {
        console.log('Rolling back token deduction...');
        await supabase.rpc('increment_tokens', {
          user_id_param: user.id,
          amount: tokenCost
        });
        console.log('Tokens refunded:', tokenCost);
      }
      
      throw txError;
    }

    // Check circuit breaker
    if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER.threshold) {
      const elapsed = Date.now() - CIRCUIT_BREAKER.lastFailure;
      if (elapsed < CIRCUIT_BREAKER.timeout) {
        // Refund tokens using RPC for atomicity
        await supabase.rpc('increment_tokens', {
          user_id_param: user.id,
          amount: tokenCost
        });

        return new Response(
          JSON.stringify({ 
            error: 'Provider temporarily unavailable. Please try again in a moment.',
            retry_after_seconds: Math.ceil((CIRCUIT_BREAKER.timeout - elapsed) / 1000)
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      CIRCUIT_BREAKER.failures = 0; // Reset after cooldown
    }

    // Track request in queue
    const requestId = generation.id;
    const requestPromise = (async () => {
      let providerRequest: any = null; // Declare outside try block for error handling access
      
      try {
        // Call provider with timeout
        const TIMEOUT_MS = 600000; // 600 seconds
        let timeoutId: number | undefined;
        
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Request timed out after 600 seconds'));
          }, TIMEOUT_MS) as unknown as number;
        });

        console.log('Parameters being sent to provider:', JSON.stringify(validatedParameters));
        
        providerRequest = {
          model: model.id,
          parameters: validatedParameters,
          api_endpoint: model.api_endpoint,
          payload_structure: model.payload_structure || 'wrapper'
        };
        
        // Only include prompt if model has prompt field
        if (hasPromptField && finalPrompt) {
          providerRequest.prompt = finalPrompt;
        }

        console.log('Provider request:', JSON.stringify(providerRequest));

        const providerResponse: any = await Promise.race([
          callProvider(model.provider, providerRequest),
          timeoutPromise
        ]);

        if (timeoutId) clearTimeout(timeoutId);

        console.log('Provider response received');

        // Check if this is a webhook-based provider (Kie.ai)
        const isWebhookProvider = model.provider === 'kie_ai' && providerResponse.metadata?.task_id;
        
        if (isWebhookProvider) {
          // For webhook providers, update with task_id and mark as processing
          const taskId = providerResponse.metadata.task_id;
          console.log('Webhook-based provider. Task ID:', taskId);
          
          const { error: updateError } = await supabase
            .from('generations')
            .update({
              provider_task_id: taskId,
              status: 'processing',
              provider_request: providerRequest,
              provider_response: providerResponse.metadata
            })
            .eq('id', generation.id);

          if (updateError) {
            console.error('Failed to update generation with task ID:', updateError);
          }
          
          // Return immediately - webhook will complete the generation
          return new Response(
            JSON.stringify({
              id: generation.id,
              generation_id: generation.id,
              status: 'processing',
              message: 'Generation started. Check back soon for results.'
            }),
            { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Phase 3: Process storage upload asynchronously (fire-and-forget with improved error handling)
        const generationId = generation.id;
        
        // Upload and update in background (don't await, but with proper error handling)
        (async () => {
          try {
            const storagePath = await uploadToStorage(
              supabase,
              user.id,
              generationId,
              providerResponse.output_data,
              providerResponse.file_extension,
              model.content_type
            );

            console.log('Uploaded to storage:', storagePath);

            const { data: { publicUrl } } = supabase.storage
              .from('generated-content')
              .getPublicUrl(storagePath);

            await supabase
              .from('generations')
              .update({
                status: 'completed',
                output_url: publicUrl,
                storage_path: storagePath,
                file_size_bytes: providerResponse.file_size,
                provider_request: providerRequest,
                provider_response: providerResponse.metadata
              })
              .eq('id', generationId);

            await supabase.from('audit_logs').insert({
              user_id: user.id,
              action: 'generation_completed',
              resource_type: 'generation',
              resource_id: generationId,
              metadata: {
                model_id: model.id,
                template_id: template_id || null,
                tokens_used: tokenCost,
                content_type: model.content_type,
                duration_ms: Date.now() - startTime
              }
            });

            console.log('Background processing completed');
          } catch (bgError) {
            console.error('Background processing error:', bgError);
            
            // Update to failed status if background task fails
            const errorMessage = bgError instanceof Error ? bgError.message : 'Background processing failed';
            await supabase
              .from('generations')
              .update({ 
                status: 'failed',
                provider_request: providerRequest,
                provider_response: { 
                  error: errorMessage,
                  full_error: bgError instanceof Error ? bgError.toString() : String(bgError),
                  timestamp: new Date().toISOString()
                } 
              })
              .eq('id', generationId);
          }
        })();

        // Reset circuit breaker on success
        CIRCUIT_BREAKER.failures = 0;

        // Phase 5: Performance logging
        console.log(JSON.stringify({
          metric: 'generation_success',
          duration_ms: Date.now() - startTime,
          model_id: model.id,
          user_id: user.id,
          tokens_used: tokenCost,
          content_type: model.content_type
        }));

        console.log('Generation processing started');

        return new Response(
          JSON.stringify({
            id: generation.id,
            status: 'processing',
            tokens_used: tokenCost,
            content_type: model.content_type,
            enhanced: enhance_prompt || !!enhancementInstruction
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (providerError: any) {
        console.error('Provider error:', providerError);

        // Increment circuit breaker on failure
        CIRCUIT_BREAKER.failures++;
        CIRCUIT_BREAKER.lastFailure = Date.now();

        const isTimeout = providerError.message?.includes('timed out');

        await supabase
          .from('generations')
          .update({
            status: 'failed',
            tokens_used: 0,
            provider_request: providerRequest,
            provider_response: { 
              error: providerError.message,
              full_error: providerError.toString(),
              timestamp: new Date().toISOString()
            }
          })
          .eq('id', generation.id);

        // Refund tokens using RPC for atomicity
        await supabase.rpc('increment_tokens', {
          user_id_param: user.id,
          amount: tokenCost
        });

        console.log(`Tokens refunded: ${tokenCost} tokens returned to user ${user.id} due to ${isTimeout ? 'timeout' : 'provider failure'}`);

        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'generation_failed',
          resource_type: 'generation',
          resource_id: generation.id,
          metadata: {
            error: providerError.message,
            model_id: model.id,
            tokens_refunded: tokenCost,
            reason: isTimeout ? 'timeout' : 'provider_error',
            duration_ms: Date.now() - startTime
          }
        });

        // Phase 5: Performance logging
        console.log(JSON.stringify({
          metric: 'generation_failure',
          duration_ms: Date.now() - startTime,
          model_id: model.id,
          user_id: user.id,
          error: providerError.message,
          circuit_breaker_failures: CIRCUIT_BREAKER.failures
        }));

        throw providerError;
      }
    })();

    activeRequests.set(requestId, requestPromise);

    try {
      return await requestPromise;
    } finally {
      activeRequests.delete(requestId);
    }

  } catch (error: any) {
    console.error('Error in generate-content:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: error.message === 'Unauthorized' ? 401 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function enhancePrompt(
  prompt: string,
  instruction: string | null,
  provider: string,
  contentType: string
): Promise<{ enhanced: string; provider: string }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const systemPrompt = instruction || `You are a prompt enhancement AI. Transform the user's prompt into a detailed, optimized prompt for ${contentType} generation. Keep the core intent but add professional details, style descriptions, and technical parameters that will improve the output quality. Return ONLY the enhanced prompt, no explanations.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Enhancement failed: ${response.status}`);
  }

  const data = await response.json();
  const enhanced = data.choices[0].message.content.trim();

  return { enhanced, provider: 'lovable_ai' };
}
