import { ProviderRequest, ProviderResponse } from "./index.ts";
import { EdgeLogger } from "../../_shared/edge-logger.ts";

// Default parameters for flat-structure models
  const FLAT_MODEL_DEFAULTS: Record<string, any> = {
    'veo3': {
      watermark: "",
      enableFallback: false,
      enableTranslation: true
    }
  };

export async function callKieAI(
  request: ProviderRequest,
  webhookToken: string
): Promise<ProviderResponse> {
  const logger = new EdgeLogger('kie-ai-provider', crypto.randomUUID());
  const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY');
  
  if (!KIE_AI_API_KEY) {
    throw new Error('KIE_AI_API_KEY not configured. Please add it to your Supabase secrets.');
  }

  const baseUrl = 'https://api.kie.ai';
  const createTaskEndpoint = request.api_endpoint || '/api/v1/jobs/createTask';
  
  logger.info('Calling Kie.ai API', { 
    metadata: { 
      model: request.model, 
      payloadStructure: request.payload_structure || 'wrapper', 
      endpoint: createTaskEndpoint 
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
  let payload: any;
  
  // Handle reference_image_urls - ensure it's an array if it's a string
  if (request.parameters.reference_image_urls && typeof request.parameters.reference_image_urls === 'string') {
    request.parameters.reference_image_urls = [request.parameters.reference_image_urls];
  }
  
  // Handle Veo3 startFrame/endFrame merging into imageUrls
  // ONLY applies to FIRST_AND_LAST_FRAMES_2_VIDEO mode (image-to-video with start/end frames)
  // SKIP for REFERENCE_2_VIDEO mode (reference images already handled as array)
  if ((request.model === 'veo3' || request.model === 'veo3_fast') && 
      request.parameters.generationType !== 'REFERENCE_2_VIDEO') {
    const startFrameValue = request.parameters.startFrame;
    const endFrameValue = request.parameters.endFrame;
    
    // Build the imageUrls array from startFrame and endFrame
    const imageUrlsArray: string[] = [];
    
    // Add start frame if present
    if (startFrameValue && typeof startFrameValue === 'string') {
      imageUrlsArray.push(startFrameValue);
    }
    
    // Add end frame if present (as second element)
    if (endFrameValue && typeof endFrameValue === 'string') {
      imageUrlsArray.push(endFrameValue);
    }
    
    // Replace with imageUrls array and remove original fields
    if (imageUrlsArray.length > 0) {
      request.parameters.imageUrls = imageUrlsArray;
      delete request.parameters.startFrame;
      delete request.parameters.endFrame;
      
      logger.debug('Merged Veo3 startFrame/endFrame for FIRST_AND_LAST_FRAMES_2_VIDEO', {
        metadata: { 
          imageCount: imageUrlsArray.length,
          hasStartFrame: !!startFrameValue,
          hasEndFrame: !!endFrameValue
        }
      });
    }
  }
  
  // For REFERENCE_2_VIDEO mode, imageUrls should already be an array from schema
  // Ensure it's properly formatted
  if (request.parameters.generationType === 'REFERENCE_2_VIDEO' && 
      request.parameters.imageUrls) {
    if (!Array.isArray(request.parameters.imageUrls)) {
      request.parameters.imageUrls = [request.parameters.imageUrls];
    }
    
    logger.debug('Veo Reference mode images', {
      metadata: { 
        imageCount: request.parameters.imageUrls.length,
        generationType: request.parameters.generationType
      }
    });
  }
  
  if (useFlatStructure) {
    // Flat structure for veo3, sora-2-*, mj_txt2img, etc.
    logger.debug('Using FLAT payload structure');
    const modelDefaults = FLAT_MODEL_DEFAULTS[request.model] || {};
    
    // Determine the correct field name: 'taskType' for Midjourney, 'model' for others
    const modelFieldName = request.model === 'mj_txt2img' ? 'taskType' : 'model';
    
    payload = {
      [modelFieldName]: request.model,
      callBackUrl: callbackUrl,
      ...modelDefaults, // Inject defaults first
      ...request.parameters // User params can override if needed (includes prompt if in schema)
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
    
    payload = {
      model: request.model,
      callBackUrl: callbackUrl,
      input: cleanedParameters // cleanedParameters already includes prompt if schema defines it
    };
  }
  
  logger.debug('Request configuration', { 
    metadata: { callbackUrl, payload: JSON.stringify(payload).substring(0, 500) } 
  });

  try {
    // Step 1: Create the task
    logger.info('Creating Kie.ai task', { metadata: { model: request.model } });
    
    const createResponse = await fetch(`${baseUrl}${createTaskEndpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      logger.error('Kie.ai task creation failed', undefined, { 
        metadata: { status: createResponse.status, error: errorText } 
      });
      throw new Error(`Kie.ai task creation failed: ${createResponse.status} - ${errorText}`);
    }

    const createData = await createResponse.json();
    logger.info('Kie.ai task created', { metadata: { response: createData } });

    // Check response structure
    if (createData.code !== 200 || !createData.data?.taskId) {
      throw new Error(`Kie.ai task creation failed: ${createData.message || 'Unknown error'}`);
    }

    const taskId = createData.data.taskId;
    logger.info('Task ID received', { metadata: { taskId, callbackUrl } });

    // Immediate status check to catch fast completions
    try {
      logger.debug('Checking immediate task status');
      const statusResponse = await fetch('https://api.kie.ai/api/v1/jobs/queryTask', {
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
        if (statusData.data?.status === 'completed') {
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
        status: 'processing',
        callback_url: callbackUrl
      }
    };

  } catch (error: any) {
    logger.error('Kie.ai provider error', error, { metadata: { model: request.model } });
    throw new Error(`Kie.ai provider failed: ${error.message}`);
  }
}
