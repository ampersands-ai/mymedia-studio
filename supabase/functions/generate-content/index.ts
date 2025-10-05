import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callProvider } from "./providers/index.ts";
import { calculateTokenCost } from "./utils/token-calculator.ts";
import { uploadToStorage } from "./utils/storage.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Calculate token cost
    const tokenCost = calculateTokenCost(
      model.base_token_cost,
      model.cost_multipliers || {},
      parameters
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

    // Call provider with timeout
    const TIMEOUT_MS = 600000; // 600 seconds
    let timeoutId: number;
    
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request timed out after 600 seconds'));
      }, TIMEOUT_MS);
    });

    try {
      const providerRequest = {
        model: model.id, // Use model ID instead of display name for API calls
        prompt: finalPrompt,
        parameters,
        api_endpoint: model.api_endpoint
      };

      const providerResponse = await Promise.race([
        callProvider(model.provider, providerRequest),
        timeoutPromise
      ]);

      // Clear timeout if successful
      clearTimeout(timeoutId);

      console.log('Provider response received');

      // Upload to storage
      const storagePath = await uploadToStorage(
        supabase,
        user.id,
        generation.id,
        providerResponse.output_data,
        providerResponse.file_extension,
        model.content_type
      );

      console.log('Uploaded to storage:', storagePath);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('generated-content')
        .getPublicUrl(storagePath);

      // Update generation record with success
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'completed',
          output_url: publicUrl,
          storage_path: storagePath,
          file_size_bytes: providerResponse.file_size,
          provider_request: providerRequest,
          provider_response: providerResponse.metadata
        })
        .eq('id', generation.id);

      if (updateError) {
        console.error('Failed to update generation:', updateError);
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'generation_completed',
        resource_type: 'generation',
        resource_id: generation.id,
        metadata: {
          model_id: model.id,
          template_id: template_id || null,
          tokens_used: tokenCost,
          content_type: model.content_type
        }
      });

      console.log('Generation completed successfully');

      return new Response(
        JSON.stringify({
          id: generation.id,
          output_url: publicUrl,
          tokens_used: tokenCost,
          status: 'completed',
          content_type: model.content_type,
          enhanced: enhance_prompt || !!enhancementInstruction
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (providerError: any) {
      console.error('Provider error:', providerError);

      const isTimeout = providerError.message?.includes('timed out');

      // Update generation record with failure
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          tokens_used: 0, // Set to 0 for failed generations
          provider_response: { error: providerError.message }
        })
        .eq('id', generation.id);

      // Refund tokens due to provider failure or timeout
      const { error: refundError } = await supabase
        .from('user_subscriptions')
        .update({ tokens_remaining: subscription.tokens_remaining })
        .eq('user_id', user.id);

      if (refundError) {
        console.error('Failed to refund tokens:', refundError);
      } else {
        console.log(`Tokens refunded: ${tokenCost} tokens returned to user ${user.id} due to ${isTimeout ? 'timeout' : 'provider failure'}`);
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'generation_failed',
        resource_type: 'generation',
        resource_id: generation.id,
        metadata: {
          error: providerError.message,
          model_id: model.id,
          tokens_refunded: tokenCost,
          reason: isTimeout ? 'timeout' : 'provider_error'
        }
      });

      return new Response(
        JSON.stringify({ 
          error: isTimeout 
            ? 'Generation timed out after 10 minutes. Your tokens have been refunded.'
            : 'Generation failed due to provider error. Your tokens have been refunded.',
          details: providerError.message,
          tokens_refunded: tokenCost
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
