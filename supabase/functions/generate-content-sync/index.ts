import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callRunware } from "./providers/runware.ts";
import { calculateTokenCost } from "./utils/token-calculator.ts";
import { uploadToStorage } from "./utils/storage.ts";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Synchronous generation endpoint for immediate-response providers (Runware)
 * This is completely separate from the async webhook-based generate-content endpoint
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user (allow service role for testing)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Check if using service role key (for test-model edge function)
    const isServiceRole = token === supabaseKey;
    
    let user: any;
    if (isServiceRole) {
      console.log('[sync] Service role authentication detected - test mode');
      user = null; // Will be set from request body
    } else {
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !userData.user) {
        throw new Error('Unauthorized: Invalid user token');
      }
      user = userData.user;
    }

    const { 
      model_id, 
      model_record_id,
      prompt, 
      custom_parameters = {},
      workflow_execution_id,
      workflow_step_number,
      user_id, // For service role calls (test mode)
    } = await req.json();
    
    // If service role, require user_id in body
    if (isServiceRole) {
      if (!user_id) {
        throw new Error('user_id required when using service role authentication');
      }
      user = { id: user_id };
      console.log('[sync] Test mode - using user_id from request:', user_id);
    }

    // Compute effective prompt with fallbacks and validate early
    const effectivePrompt = (
      (prompt ?? '') ||
      (custom_parameters?.positivePrompt ?? '') ||
      (custom_parameters?.prompt ?? '')
    ).toString().trim();

    if (effectivePrompt.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required and must be at least 2 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sync] Generation request:', { user_id: user.id, model_record_id, model_id });

    // Load model configuration
    const query = supabase
      .from('ai_models')
      .select('*')
      .eq('is_active', true);
    
    if (model_record_id) {
      query.eq('record_id', model_record_id);
    } else if (model_id) {
      query.eq('id', model_id);
    } else {
      throw new Error('Must provide model_id or model_record_id');
    }
    
    const { data: model, error: modelError } = await query.single();

    if (modelError || !model) {
      throw new Error('Model not found or inactive');
    }

    // Verify this is a runware model
    if (model.provider !== 'runware') {
      throw new Error('This endpoint only supports Runware models. Use generate-content for other providers.');
    }

    console.log('[sync] Using model:', model.id, 'Provider:', model.provider);

    // Rate limiting check
    const { data: userSubscription } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const userPlan = userSubscription?.plan || 'freemium';

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
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and filter parameters
    function validateAndFilterParameters(
      parameters: Record<string, any>,
      schema: any
    ): Record<string, any> {
      if (!schema?.properties) return parameters;
      
      const allowedKeys = Object.keys(schema.properties);
      const filtered: Record<string, any> = {};
      
      for (const key of allowedKeys) {
        const schemaProperty = schema.properties[key];
        const candidateValue = parameters[key];
        
        // For parameters marked showToUser: false, ALWAYS use schema default (ignore user input)
        if (schemaProperty?.showToUser === false) {
          if (schemaProperty?.default !== undefined) {
            filtered[key] = schemaProperty.default;
          }
          continue;
        }
        
        // For user-visible parameters, handle normally
        if (schemaProperty?.enum && Array.isArray(schemaProperty.enum)) {
          if (candidateValue === "" || candidateValue === undefined || candidateValue === null) {
            if (schemaProperty.default !== undefined) {
              filtered[key] = schemaProperty.default;
            }
          } else if (!schemaProperty.enum.includes(candidateValue)) {
            if (schemaProperty.default !== undefined) {
              filtered[key] = schemaProperty.default;
            } else {
              throw new Error(`Invalid parameter '${key}'. Value '${candidateValue}' not in allowed values.`);
            }
          } else {
            filtered[key] = candidateValue;
          }
        } else if (candidateValue !== undefined && candidateValue !== null && candidateValue !== '') {
          filtered[key] = candidateValue;
        } else if (schemaProperty?.default !== undefined) {
          filtered[key] = schemaProperty.default;
        } else if (candidateValue !== undefined) {
          filtered[key] = candidateValue;
        }
      }
      
      return filtered;
    }

    const parameters = validateAndFilterParameters(custom_parameters, model.input_schema);
    
    console.log('[sync] Validated parameters before provider call:', JSON.stringify(parameters, null, 2));

    // Calculate token cost
    const tokenCost = calculateTokenCost(
      model.base_token_cost,
      model.cost_multipliers || {},
      parameters
    );

    console.log('[sync] Token cost calculated:', tokenCost);

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
        JSON.stringify({ 
          error: 'Insufficient credits',
          type: 'INSUFFICIENT_TOKENS',
          required: tokenCost,
          available: subscription.tokens_remaining,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct tokens
    const { error: deductError } = await supabase
      .from('user_subscriptions')
      .update({ tokens_remaining: subscription.tokens_remaining - tokenCost })
      .eq('user_id', user.id)
      .eq('tokens_remaining', subscription.tokens_remaining);

    if (deductError) {
      throw new Error('Failed to deduct tokens');
    }

    console.log('[sync] Tokens deducted:', tokenCost);

    // Create generation record
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        model_id: model.id,
        model_record_id: model.record_id,
        type: model.content_type,
        prompt: effectivePrompt,
        original_prompt: effectivePrompt,
        settings: parameters,
        tokens_used: tokenCost,
        actual_token_cost: tokenCost,
        status: 'pending',
        workflow_execution_id: workflow_execution_id || null,
        workflow_step_number: workflow_step_number || null
      })
      .select()
      .single();

    if (genError || !generation) {
      // Refund tokens
      await supabase.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: tokenCost
      });
      throw new Error('Failed to create generation record');
    }

    console.log('[sync] Generation created:', generation.id);

    try {
      // Call Runware provider synchronously
      const providerRequest = {
        model: model.id,
        prompt: effectivePrompt,
        parameters: parameters,
      };

      console.log('[sync] Calling Runware provider...');
      
      const providerResponse = await callRunware(providerRequest);

      console.log('[sync] Provider response received, uploading to storage...');

      let storagePath: string;
      let fileSize = providerResponse.file_size;

      // Check if provider already uploaded to storage
      if (providerResponse.storage_path) {
        console.log('[sync] Content already in storage:', providerResponse.storage_path);
        storagePath = providerResponse.storage_path;
        
        // Get actual file size if not provided
        if (!fileSize) {
          const folderPath = storagePath.substring(0, storagePath.lastIndexOf('/'));
          const { data: fileData } = await supabase.storage
            .from('generated-content')
            .list(folderPath);
          
          if (fileData && fileData.length > 0) {
            const file = fileData.find(f => f.name === 'output.mp4');
            if (file) {
              fileSize = file.metadata?.size || 0;
            }
          }
        }
      } else {
        // Normal upload flow
        storagePath = await uploadToStorage(
          supabase,
          user.id,
          generation.id,
          providerResponse.output_data,
          providerResponse.file_extension,
          model.content_type
        );
      }

      const { data: { publicUrl } } = supabase.storage
        .from('generated-content')
        .getPublicUrl(storagePath);

      // Update generation to completed
      await supabase
        .from('generations')
        .update({
          status: 'completed',
          output_url: publicUrl,
          storage_path: storagePath,
          file_size_bytes: fileSize,
          provider_request: providerRequest,
          provider_response: providerResponse.metadata
        })
        .eq('id', generation.id);

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'generation_completed',
        resource_type: 'generation',
        resource_id: generation.id,
        metadata: {
          model_id: model.id,
          tokens_used: tokenCost,
          content_type: model.content_type,
          duration_ms: Date.now() - startTime,
          provider: 'runware'
        }
      });

      console.log('[sync] Generation completed:', generation.id);
      console.log(JSON.stringify({
        metric: 'sync_generation_success',
        duration_ms: Date.now() - startTime,
        model_id: model.id,
        user_id: user.id,
        provider: 'runware'
      }));

      return new Response(
        JSON.stringify({
          id: generation.id,
          status: 'completed',
          output_url: publicUrl,
          tokens_used: tokenCost,
          content_type: model.content_type
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (providerError: any) {
      console.error('[sync] Provider error:', providerError);

      // Update generation to failed
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          tokens_used: 0,
          provider_response: { 
            error: providerError.message?.substring(0, 200) || 'Generation failed',
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', generation.id);

      // Refund tokens
      await supabase.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: tokenCost
      });

      console.log(`[sync] Tokens refunded: ${tokenCost}`);

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'generation_failed',
        resource_type: 'generation',
        resource_id: generation.id,
        metadata: {
          error: providerError.message,
          model_id: model.id,
          tokens_refunded: tokenCost,
          provider: 'runware'
        }
      });

      throw providerError;
    }

  } catch (error: any) {
    return createSafeErrorResponse(error, 'generate-content-sync', corsHeaders);
  }
});
