import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRunwareApiKey } from "../_shared/getRunwareApiKey.ts";
import { getKieApiKey } from "../_shared/getKieApiKey.ts";
import { uploadToStorage } from "../_shared/storage.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecuteModelRequest {
  model_record_id: string;
  prompt: string;
  model_parameters: Record<string, any>;
  uploaded_image_urls?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request
    const { model_record_id, prompt, model_parameters, uploaded_image_urls }: ExecuteModelRequest = await req.json();

    // Load model from database
    const { data: model, error: modelError } = await supabaseClient
      .from('ai_models')
      .select('*')
      .eq('record_id', model_record_id)
      .single();
    
    if (modelError || !model) {
      throw new Error('Model not found');
    }

    // Calculate token cost
    let tokenCost = model.base_token_cost;
    if (model.cost_multipliers) {
      for (const [param, multiplierConfig] of Object.entries(model.cost_multipliers)) {
        const value = model_parameters[param];
        if (value && typeof multiplierConfig === 'object') {
          const multiplier = (multiplierConfig as Record<string, number>)[value] ?? 1;
          tokenCost *= multiplier;
        }
      }
    }

    // Create generation record
    const { data: generation, error: genError } = await supabaseClient
      .from('generations')
      .insert({
        user_id: user.id,
        model_id: model.id,
        model_record_id: model.record_id,
        type: model.content_type,
        prompt,
        tokens_used: tokenCost,
        status: 'processing',
        settings: model_parameters
      })
      .select()
      .single();

    if (genError || !generation) {
      throw new Error(`Failed to create generation: ${genError?.message}`);
    }

    // Get API key based on provider
    let apiKey: string;
    if (model.provider === 'runware') {
      apiKey = getRunwareApiKey(model.id);
    } else if (model.provider === 'kie_ai') {
      apiKey = getKieApiKey(model.id, model.record_id);
    } else if (model.provider === 'lovable_ai_sync') {
      // Lovable AI models handled separately via generate-content-sync
      throw new Error('Use generate-content-sync for Lovable AI models');
    } else {
      throw new Error(`Unknown provider: ${model.provider}`);
    }

    // Prepare inputs
    const inputs: Record<string, any> = { prompt, ...model_parameters };
    
    // Add uploaded images if applicable
    if (uploaded_image_urls && uploaded_image_urls.length > 0) {
      if (model.content_type === 'video' || model.provider === 'runware') {
        inputs.inputImage = uploaded_image_urls[0]; // Runware uses inputImage
      } else if (inputs.image_urls !== undefined) {
        inputs.image_urls = uploaded_image_urls;
      }
    }

    // Prepare payload based on model structure
    let payload: any;
    
    // CRITICAL: Check Runware FIRST - all Runware models require array format
    // regardless of their payload_structure setting in the database
    if (model.provider === 'runware') {
      const taskUUID = crypto.randomUUID();
      
      // Ensure taskType is set (default to imageInference if not provided)
      if (!inputs.taskType) {
        inputs.taskType = 'imageInference';
      }
      
      payload = [
        {
          taskType: "authentication",
          apiKey: apiKey
        },
        {
          taskUUID,
          ...inputs
        }
      ];
      console.log('Runware payload created:', JSON.stringify(payload, null, 2));
    } 
    // Handle non-Runware providers based on payload_structure
    else if (model.payload_structure === 'wrapper') {
      payload = {
        modelId: model.id,
        input: inputs
      };
    } else if (model.payload_structure === 'direct') {
      payload = inputs;
    } else if (model.payload_structure === 'flat') {
      payload = inputs;
    } else {
      payload = inputs;
    }

    console.log('Provider:', model.provider, 'Payload structure:', model.payload_structure);
    console.log('Sending payload:', JSON.stringify(payload).substring(0, 200));

    // Call external API
    let apiEndpoint: string;
    let headers: Record<string, string>;
    
    if (model.provider === 'runware') {
      // Runware uses its own endpoint and doesn't need Authorization header
      apiEndpoint = model.api_endpoint || 'https://api.runware.ai/v1';
      headers = {
        'Content-Type': 'application/json'
      };
    } else {
      // KIE AI and others use Bearer token auth
      apiEndpoint = model.api_endpoint || 'https://api.kie.ai/api/v1/jobs/createTask';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
    }
    
    const apiResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`API failed (${apiResponse.status}): ${errorText}`);
    }

    const result = await apiResponse.json();

    // Extract task ID based on response structure
    let taskId: string | undefined;
    if (Array.isArray(result) && result[0]?.taskUUID) {
      taskId = result[0].taskUUID; // Runware format
    } else if (result.taskId) {
      taskId = result.taskId; // KIE AI format
    } else if (result.id) {
      taskId = result.id;
    }

    // Check if this is a synchronous Runware response with immediate result
    if (model.provider === 'runware' && result.data?.[0]?.imageURL) {
      console.log('Processing synchronous Runware response');
      
      try {
        const imageUrl = result.data[0].imageURL;
        console.log('Downloading image from:', imageUrl);
        
        // Download image from Runware
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        
        const imageData = new Uint8Array(await imageResponse.arrayBuffer());
        console.log('Image downloaded, size:', imageData.length);
        
        // Upload to Supabase storage
        const storagePath = await uploadToStorage(
          supabaseClient,
          user.id,
          generation.id,
          imageData,
          'png',
          'image'
        );
        console.log('Image uploaded to storage:', storagePath);
        
        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('generated-content')
          .getPublicUrl(storagePath);
        
        console.log('Public URL:', publicUrl);
        
        // Update generation to completed
        await supabaseClient
          .from('generations')
          .update({
            status: 'completed',
            output_url: publicUrl,
            storage_path: storagePath,
            provider_task_id: taskId,
            provider_request: payload,
            provider_response: result
          })
          .eq('id', generation.id);
        
        console.log('Generation marked as completed');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            generation_id: generation.id,
            status: 'completed',
            output_url: publicUrl
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } catch (storageError) {
        console.error('Failed to process synchronous result:', storageError);
        
        // Mark generation as failed
        await supabaseClient
          .from('generations')
          .update({
            status: 'failed',
            provider_task_id: taskId,
            provider_request: payload,
            provider_response: result
          })
          .eq('id', generation.id);
        
        throw new Error(`Failed to process result: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`);
      }
    }

    // Async response (KIE AI or other) - webhook will handle completion
    console.log('Processing asynchronous response, waiting for webhook');
    await supabaseClient
      .from('generations')
      .update({
        provider_task_id: taskId,
        provider_request: payload,
        provider_response: result,
        status: 'pending'
      })
      .eq('id', generation.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        generation_id: generation.id,
        task_id: taskId,
        status: 'pending'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Model execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Model execution failed';
    
    // Map errors to appropriate status codes
    let statusCode = 500;
    if (errorMessage === 'Unauthorized') {
      statusCode = 401;
    } else if (errorMessage.includes('Model not found')) {
      statusCode = 404;
    } else if (errorMessage.includes('API key not configured') || errorMessage.includes('not configured')) {
      statusCode = 503; // Service unavailable
    } else if (errorMessage.includes('API failed')) {
      statusCode = 502; // Bad gateway
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
