import { ProviderRequest, ProviderResponse } from "./index.ts";
import { EdgeLogger } from "../../_shared/edge-logger.ts";
import { GENERATION_STATUS } from "../../_shared/constants.ts";
import { API_ENDPOINTS } from "../../_shared/api-endpoints.ts";

// API key mapping logic for provider
function getKieApiKey(modelId: string, recordId: string): string {
  const veo3Models = [
    '8aac94cb-5625-47f4-880c-4f0fd8bd83a1',
    'a5c2ec16-6294-4588-86b6-7b4182601cda',
    '6e8a863e-8630-4eef-bdbb-5b41f4c883f9',
    'f8e9c7a5-9d4b-6f2c-8a1e-5d7b3c9f4a6e',
    'e9c8b7a6-8d5c-4f3e-9a2f-6d8b5c9e4a7f',
  ];
  
  const sora2Models = [
    'd7f8c5a3-9b2e-6f4d-8c9a-5e7b3a6d4f8c',
    'c6e5b4a3-5d2f-1c0e-6a9f-3d5b6c7e4a8f',
  ];
  
  const nanoBananaModels = ['c7e9a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e'];
  const seedreamV4Models = ['d2ffb834-fc59-4c80-bf48-c2cc25281fdd', 'a6c8e4f7-9d2b-5f3c-8a6e-7d4b9c5f3a8e'];
  
  let secretName: string;
  
  if (veo3Models.includes(recordId)) secretName = 'KIE_AI_API_KEY_VEO3';
  else if (sora2Models.includes(recordId)) secretName = 'KIE_AI_API_KEY_SORA2';
  else if (nanoBananaModels.includes(recordId)) secretName = 'KIE_AI_API_KEY_NANO_BANANA';
  else if (seedreamV4Models.includes(recordId)) secretName = 'KIE_AI_API_KEY_SEEDREAM_V4';
  else if (modelId.includes('image_editing')) secretName = 'KIE_AI_API_KEY_IMAGE_EDITING';
  else if (modelId.includes('image_to_video')) secretName = 'KIE_AI_API_KEY_IMAGE_TO_VIDEO';
  else if (modelId.includes('prompt_to_image')) secretName = 'KIE_AI_API_KEY_PROMPT_TO_IMAGE';
  else if (modelId.includes('prompt_to_video')) secretName = 'KIE_AI_API_KEY_PROMPT_TO_VIDEO';
  else if (modelId.includes('prompt_to_audio')) secretName = 'KIE_AI_API_KEY_PROMPT_TO_AUDIO';
  else secretName = 'KIE_AI_API_KEY';
  
  const apiKey = Deno.env.get(secretName) || Deno.env.get('KIE_AI_API_KEY');
  
  if (!apiKey) {
    throw new Error(`${secretName} not configured`);
  }
  
  return apiKey;
}

/**
 * Provider Implementation
 *
 * NOTE: All model-specific parameter preprocessing (prompt->text, etc.) should be
 * handled in individual model .ts files via preparePayload() functions.
 * This provider is a dumb transport layer that calls the provider API.
 *
 * Example: ElevenLabs models handle prompt->text mapping in their own .ts files.
 */

export async function callKieAI(
  request: ProviderRequest,
  webhookToken: string
): Promise<ProviderResponse> {
  const logger = new EdgeLogger('kie-ai-provider', crypto.randomUUID());
  const KIE_AI_API_KEY = getKieApiKey(request.model, request.model_record_id || '');

  const createTaskUrl = request.api_endpoint
    ? `${API_ENDPOINTS.KIE_AI.BASE}${request.api_endpoint}`
    : API_ENDPOINTS.KIE_AI.createTaskUrl;

  logger.info('Calling generation API', {
    metadata: {
      model: request.model,
      payloadStructure: request.payload_structure || 'wrapper',
      endpoint: createTaskUrl
    }
  });

  // Build request payload with callback URL including security tokens
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const urlToken = Deno.env.get('KIE_WEBHOOK_URL_TOKEN');
  
  if (!urlToken) {
    throw new Error('KIE_WEBHOOK_URL_TOKEN not configured. Please add it to your Supabase secrets.');
  }
  
  // Construct callback URL with both security tokens
  const callbackUrl = `${supabaseUrl}/functions/v1/kie-ai-webhook?token=${urlToken}&verify=${webhookToken}`;
  
  logger.debug('Callback URL configured with security tokens');

  const useFlatStructure = request.payload_structure === 'flat';
  let payload: Record<string, unknown>;
  
  // Handle reference_image_urls - ensure it's an array if it's a string
  if (request.parameters.reference_image_urls && typeof request.parameters.reference_image_urls === 'string') {
    request.parameters.reference_image_urls = [request.parameters.reference_image_urls];
  }
  
  // No more generic transformations - all model-specific logic moved to locked model files
  // This provider is now a dumb transport layer that sends whatever payload it receives
  
  if (useFlatStructure) {
    // Flat structure for veo3, sora-2-*, mj_txt2img, mj_video, etc.
    logger.debug('Using FLAT payload structure');
    
    // Check if taskType is already provided by the model's preparePayload (e.g., mj_video, mj_txt2img)
    const hasTaskType = 'taskType' in request.parameters;
    
    // Determine the correct field name: 'taskType' for Midjourney models, 'model' for others
    const isMidjourneyModel = hasTaskType || 
                               request.model === 'mj_txt2img' || 
                               request.model === 'midjourney/text-to-image' ||
                               request.model.includes('midjourney');
    const modelFieldName = isMidjourneyModel ? 'taskType' : 'model';
    
    // For Midjourney, use the taskType from parameters if provided, else default to mj_txt2img
    const modelValue = hasTaskType 
      ? request.parameters.taskType  // Respect model's preparePayload (e.g., mj_video)
      : (isMidjourneyModel ? 'mj_txt2img' : request.model);
    
    // No more FLAT_MODEL_DEFAULTS - all transformations happen in locked model files
    payload = {
      [modelFieldName]: modelValue,
      callBackUrl: callbackUrl,  // System field - not from schema
      ...request.parameters // All parameters come from locked model preparePayload or schema
    };
  } else {
    // Standard nested input structure for other models
    logger.debug('Using WRAPPER payload structure');
    
    // Strip "input." prefix from parameter keys if present
    const cleanedParameters: Record<string, any> = {};
    for (const [key, value] of Object.entries(request.parameters)) {
      const cleanKey = key.startsWith('input.') ? key.substring(6) : key;
      cleanedParameters[cleanKey] = value;
    }
    
    // For wrapper structure, callBackUrl must be at the TOP LEVEL (not inside input)
    // This matches the November 17th working structure
    payload = {
      model: request.model,
      callBackUrl: callbackUrl, // System field - TOP LEVEL to match provider expectations
      input: cleanedParameters
    };
  }
  
  logger.debug('Request configuration', { 
    metadata: { callbackUrl, payload: JSON.stringify(payload).substring(0, 500) } 
  });

  try {
    // Step 1: Create the task
    logger.info('Creating generation task', { metadata: { model: request.model } });

    const createResponse = await fetch(createTaskUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      logger.error('Task creation failed', undefined, { 
        metadata: { status: createResponse.status, error: errorText } 
      });
      throw new Error(`Task creation failed: ${createResponse.status} - ${errorText}`);
    }

    const createData = await createResponse.json();
    logger.info('Generation task created', { metadata: { response: createData } });

    // Check response structure
    if (createData.code !== 200 || !createData.data?.taskId) {
      throw new Error(`Task creation failed: ${createData.msg || 'Unknown error'}`);
    }

    const taskId = createData.data.taskId;
    logger.info('Task ID received', { metadata: { taskId, callbackUrl } });

    // Immediate status check to catch fast completions
    try {
      logger.debug('Checking immediate task status');
      const statusResponse = await fetch(API_ENDPOINTS.KIE_AI.queryTaskUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KIE_AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId })
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        logger.info('Immediate status check', { 
          metadata: { status: statusData.data?.status, taskId } 
        });
        
        // If already completed, we could process it here instead of waiting for webhook
        // But for now, we'll let the webhook handler deal with it
        if (statusData.data?.status === GENERATION_STATUS.COMPLETED) {
          logger.warn('Task completed immediately - webhook should arrive soon', { 
            metadata: { taskId } 
          });
        }
      }
    } catch (statusError) {
      logger.warn('Could not check immediate status (non-critical)', { 
        metadata: { error: statusError instanceof Error ? statusError.message : String(statusError) } 
      });
    }

    // Return immediately - webhook will handle the rest
    // We return empty data since the webhook will populate it later
    return {
      output_data: new Uint8Array(), // Empty - webhook will handle
      file_extension: 'pending',
      file_size: 0,
      metadata: {
        model: request.model,
        task_id: taskId,
        status: GENERATION_STATUS.PROCESSING,
        callback_url: callbackUrl
      }
    };

  } catch (error) {
    logger.error('Generation provider error', error as Error, { metadata: { model: request.model } });
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Generation provider failed: ${errorMsg}`);
  }
}
