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
      prompt, 
      custom_parameters = {},
      enhance_prompt = false,
      enhancement_provider = 'lovable_ai'
    } = await req.json();

    console.log('Generation request:', { user_id: user.id, template_id, model_id, enhance_prompt });

    // Validate: template_id XOR model_id
    if ((!template_id && !model_id) || (template_id && model_id)) {
      throw new Error('Must provide either template_id or model_id, not both');
    }

    if (!prompt || prompt.length < 3 || prompt.length > 2000) {
      throw new Error('Prompt must be between 3 and 2000 characters');
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
      // Custom mode
      const { data: modelData, error: modelError } = await supabase
        .from('ai_models')
        .select('*')
        .eq('id', model_id)
        .eq('is_active', true)
        .single();

      if (modelError || !modelData) {
        throw new Error('Model not found or inactive');
      }

      model = modelData;
      parameters = custom_parameters;
    }

    console.log('Using model:', model.id, 'Provider:', model.provider);

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

    // Enhance prompt if requested
    let finalPrompt = prompt;
    let originalPrompt = prompt;
    let usedEnhancementProvider = null;

    if (enhance_prompt || enhancementInstruction) {
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

    const validatedParameters = validateAndFilterParameters(
      parameters,
      model.input_schema
    );

    // Calculate token cost with validated parameters
    const tokenCost = calculateTokenCost(
      model.base_token_cost,
      model.cost_multipliers || {},
      validatedParameters
    );

    console.log('Token cost calculated:', tokenCost);

    // Check and deduct tokens
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

    // Deduct tokens
    const { error: deductError } = await supabase
      .from('user_subscriptions')
      .update({ tokens_remaining: subscription.tokens_remaining - tokenCost })
      .eq('user_id', user.id);

    if (deductError) {
      throw new Error('Failed to deduct tokens');
    }

    console.log('Tokens deducted:', tokenCost);

    // Create generation record (pending)
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        model_id: model.id,
        template_id: template_id || null,
        type: model.content_type,
        prompt: finalPrompt,
        original_prompt: originalPrompt,
        enhanced_prompt: enhance_prompt ? finalPrompt : null,
        enhancement_provider: usedEnhancementProvider,
        settings: parameters,
        tokens_used: tokenCost,
        actual_token_cost: tokenCost,
        status: 'pending'
      })
      .select()
      .single();

    if (genError || !generation) {
      // Refund tokens on error
      await supabase
        .from('user_subscriptions')
        .update({ tokens_remaining: subscription.tokens_remaining })
        .eq('user_id', user.id);
      
      throw new Error('Failed to create generation record');
    }

    console.log('Generation record created:', generation.id);

    // Check circuit breaker
    if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER.threshold) {
      const elapsed = Date.now() - CIRCUIT_BREAKER.lastFailure;
      if (elapsed < CIRCUIT_BREAKER.timeout) {
        // Refund tokens
        await supabase
          .from('user_subscriptions')
          .update({ tokens_remaining: subscription.tokens_remaining })
          .eq('user_id', user.id);

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
        
        const providerRequest = {
          model: model.id,
          prompt: finalPrompt,
          parameters: validatedParameters,
          api_endpoint: model.api_endpoint
        };

        console.log('Provider request:', JSON.stringify(providerRequest));

        const providerResponse: any = await Promise.race([
          callProvider(model.provider, providerRequest),
          timeoutPromise
        ]);

        if (timeoutId) clearTimeout(timeoutId);

        console.log('Provider response received');

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
                provider_response: { error: errorMessage } 
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
            provider_response: { error: providerError.message }
          })
          .eq('id', generation.id);

        const { error: refundError } = await supabase
          .from('user_subscriptions')
          .update({ tokens_remaining: subscription.tokens_remaining })
          .eq('user_id', user.id);

        if (refundError) {
          console.error('Failed to refund tokens:', refundError);
        } else {
          console.log(`Tokens refunded: ${tokenCost} tokens returned to user ${user.id} due to ${isTimeout ? 'timeout' : 'provider failure'}`);
        }

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
