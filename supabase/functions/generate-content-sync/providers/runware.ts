import { ProviderRequest, ProviderResponse } from "./index.ts";
import { GENERATION_STATUS } from "../../_shared/constants.ts";
import { EdgeLogger } from "../../_shared/edge-logger.ts";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function convertFrameImagesToRunwareFormat(frameImages: string[], logger: EdgeLogger): Promise<Array<{inputImage: string}>> {
  const converted = [];

  for (const imageUrl of frameImages) {
    logger.info('Fetching frame image', { metadata: { url: imageUrl.substring(0, 80) } });

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch frame image: ${response.status} ${response.statusText}`);
      }

      const imageBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(imageBuffer);
      const base64 = uint8ArrayToBase64(uint8Array);
      const contentType = response.headers.get('content-type') || 'image/png';
      const dataUri = `data:${contentType};base64,${base64}`;

      logger.info('Frame converted', { metadata: { sizeKB: Math.round(dataUri.length / 1024) } });
      converted.push({ inputImage: dataUri });

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('Frame conversion failed', errorObj);
      throw new Error(`Failed to convert frame image: ${errorObj.message}`);
    }
  }

  return converted;
}

interface RunwareVideoResult {
  taskUUID: string;
  status: string;
  videoURL?: string;
}

async function pollForVideoResult(taskUUID: string, apiKey: string, apiUrl: string, logger: EdgeLogger): Promise<RunwareVideoResult> {
  const maxAttempts = 8;
  const delays = [1500, 2500, 4000, 6000, 8000, 10000, 12000, 15000]; // ~60s total

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, delays[attempt]));

    logger.info('Poll attempt', { metadata: { attempt: attempt + 1, maxAttempts, taskUUID } });

    const pollPayload = [
      { taskType: "authentication", apiKey },
      { taskType: "getResponse", taskUUID }
    ];

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pollPayload),
    });

    if (!response.ok) {
      logger.error('HTTP error', new Error(`HTTP ${response.status}`), { metadata: { status: response.status } });
      continue;
    }

    const result = await response.json();
    logger.info('Response received', { metadata: { hasResult: !!result } });

    if (result.data) {
      for (const item of result.data) {
        if (item.taskUUID === taskUUID) {
          // Check for errors
          interface RunwareError {
            taskUUID: string;
            message?: string;
            code?: string;
          }
          if (result.errors?.some((e: RunwareError) => e.taskUUID === taskUUID)) {
            const error = result.errors.find((e: RunwareError) => e.taskUUID === taskUUID);
            throw new Error(`Runware error: ${error?.message || error?.code || 'Unknown error'}`);
          }

          // Check if complete with video URL
          if (item.status === "success" && item.videoURL) {
            logger.info('Video ready', { metadata: { videoURL: item.videoURL.substring(0, 80) } });
            return item;
          }

          // Still processing
          if (item.status === GENERATION_STATUS.PROCESSING) {
            logger.info('Still processing');
            break;
          }
        }
      }
    }
  }

  throw new Error("Video generation timed out after 60 seconds");
}

// Removed hardcoded MODEL_RESTRICTIONS - now using dynamic schema-based validation

/**
 * Get Runware API key from environment using explicit key name
 * No more model ID pattern matching - uses explicit use_api_key field
 */
function getRunwareApiKeyFromEnv(use_api_key: string): string {
  const apiKey = Deno.env.get(use_api_key) || Deno.env.get('RUNWARE_API_KEY');

  if (!apiKey) {
    throw new Error(`${use_api_key} not configured. Please set this environment variable.`);
  }

  return apiKey;
}

export async function callRunware(
  request: ProviderRequest
): Promise<ProviderResponse> {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('runware-sync-provider', requestId);

  // Use explicit API key from request, fallback to default for backwards compatibility
  const apiKeyName = request.use_api_key || 'RUNWARE_API_KEY';
  const RUNWARE_API_KEY = getRunwareApiKeyFromEnv(apiKeyName);

  const apiUrl = 'https://api.runware.ai/v1';

  // Generate unique task UUID
  const taskUUID = crypto.randomUUID();

  // Clean model ID
  const cleanModel = request.model.replace(/["'\s]+$/g, '');

  logger.info('API call starting', { metadata: { model: cleanModel, taskUUID } });

  // Get schema properties (what fields this model actually accepts)
  const params = request.parameters || {};
  const schemaProperties = request.input_schema?.properties || {};
  const requiredFields = request.input_schema?.required || [];

  // Handle prompt fields dynamically (prompt, positivePrompt, positive_prompt)
  const promptAliases = ['prompt', 'positivePrompt', 'positive_prompt'];
  const promptField = promptAliases.find(alias => schemaProperties[alias]);

  let effectivePrompt = '';
  if (promptField) {
    // Check if this model's schema requires a prompt
    const isPromptRequired = requiredFields.includes(promptField);
    
    // Get effective prompt value
    effectivePrompt = (
      request.prompt?.trim() || 
      params[promptField]?.trim() || 
      ''
    );
    
    // Validate ONLY if schema says it's required
    if (isPromptRequired && (!effectivePrompt || effectivePrompt.length < 2)) {
      logger.error('Missing required prompt', new Error(`Missing required parameter: ${promptField}`), {
        metadata: {
          promptField,
          isRequired: isPromptRequired,
          hasRequestPrompt: !!request.prompt,
          hasParamsPrompt: !!params[promptField]
        }
      });
      throw new Error(`Missing required parameter: ${promptField}`);
    }

    if (effectivePrompt && effectivePrompt.length > 3000) {
      throw new Error('Prompt must be less than 3000 characters.');
    }
  }

  logger.info('Prompt', { metadata: { prompt: effectivePrompt.substring(0, 100), truncated: effectivePrompt.length > 100 } });

  // Determine task type from parameters or infer from model/params
  const taskType = params.taskType || (params.frameImages ? "videoInference" : "imageInference");
  const isVideo = taskType === "videoInference";

  logger.info('Task configuration', { metadata: { taskType, isVideo } });
  
  // For video tasks, generate presigned URL for direct upload by Runware
  let presignedUrl: string | null = null;
  let storagePath: string | null = null;

  if (isVideo && request.userId && request.generationId && request.supabase) {
    const timestamp = new Date();
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    
    storagePath = `${request.userId}/${year}-${month}-${day}/${request.generationId}/output.mp4`;
    
    const { data: signedData, error: signedError } = await request.supabase.storage
      .from('generated-content')
      .createSignedUploadUrl(storagePath, { upsert: true });
    
    if (signedError || !signedData) {
      logger.error('Presigned URL creation failed', signedError as Error, { metadata: { error: signedError.message } });
      // Continue without uploadEndpoint as fallback
    } else {
      presignedUrl = signedData.signedUrl;
      logger.info('Presigned URL generated', { metadata: { storagePath } });
    }
  }

  // Build task payload dynamically from schema
  const taskPayload: Record<string, unknown> = {
    taskType,
    taskUUID,
    model: cleanModel,
  };

  // ONLY add parameters that exist in the schema
  for (const [key, value] of Object.entries(params)) {
    if (schemaProperties[key]) {
      taskPayload[key] = value;
    }
  }

  // Set prompt if we have a value
  if (effectivePrompt && promptField) {
    taskPayload[promptField] = effectivePrompt;
  }

  // Build request payload with authentication and task
  const requestBody = [
    {
      taskType: "authentication",
      apiKey: RUNWARE_API_KEY
    },
    taskPayload
  ];

  logger.info('Final task payload', {
    metadata: {
      model: cleanModel,
      taskUUID,
      parameterKeys: Object.keys(taskPayload),
      hasOutputFormat: !!taskPayload.outputFormat,
      isVideo
    }
  });
  logger.debug('Request body prepared', { metadata: { paramCount: requestBody.length } });
  logger.info('Calling Runware API', { metadata: { apiUrl, taskUUID, model: cleanModel } });

  try {
    // Call Runware API (no Authorization header, auth is in body)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    logger.info('Response received', { metadata: { hasData: !!responseData.data } });

    // Check for errors in response
    if (responseData.errors && responseData.errors.length > 0) {
      const error = responseData.errors[0];
      throw new Error(error.message || `Runware API error: ${error.code}`);
    }

    if (!response.ok) {
      throw new Error(`Runware API failed: ${response.status}`);
    }

    // Validate response structure
    if (!responseData.data || !Array.isArray(responseData.data) || responseData.data.length === 0) {
      throw new Error('Invalid response from Runware API');
    }

    // Check for inference result in response
    const inferenceResult = responseData.data?.find((item: { taskUUID: string; imageURL?: string; imageUUID?: string; videoURL?: string }) =>
      item.taskUUID === taskUUID && (item.imageURL || item.imageUUID || item.videoURL)
    );

    if (!inferenceResult) {
      logger.error('No inference result', new Error('No inference result in Runware response'), {
        metadata: {
          responseData: JSON.stringify(responseData).substring(0, 500),
          taskUUID
        }
      });
      throw new Error(
        'No inference result in Runware response. ' +
        'This may be a temporary API issue. Please try again.'
      );
    }
    
    const result = inferenceResult;

    // Check for errors in result
    if (result.error) {
      throw new Error(`Runware generation failed: ${result.error}`);
    }

    // Note: Video direct upload handling is done in the main edge function
    // This provider just calls Runware with uploadEndpoint if provided

    // For video without uploadEndpoint or images, use traditional download
    // Extract content URL (imageURL or videoURL)
    let contentUrl = result.imageURL || result.videoURL;
    
    // If no immediate URL for video, poll for async result
    if (!contentUrl && isVideo) {
      logger.info('Starting polling');
      const polledResult = await pollForVideoResult(taskUUID, RUNWARE_API_KEY, apiUrl, logger);
      contentUrl = polledResult.videoURL;

      if (!contentUrl) {
        throw new Error("No video URL after polling");
      }
    } else if (!contentUrl) {
      throw new Error(`No ${isVideo ? 'video' : 'image'} URL in Runware response`);
    }

    logger.info('Content URL generated', { metadata: { isVideo, url: contentUrl.substring(0, 80) } });

    // Download the content
    const contentResponse = await fetch(contentUrl);
    if (!contentResponse.ok) {
      throw new Error(`Failed to download ${isVideo ? 'video' : 'image'}: ${contentResponse.status}`);
    }

    const contentData = await contentResponse.arrayBuffer();
    const uint8Data = new Uint8Array(contentData);

    // Determine file extension
    const outputFormat = params.outputFormat?.toLowerCase() || (isVideo ? 'mp4' : 'webp');
    const fileExtension = determineFileExtension(outputFormat, contentUrl, isVideo);

    logger.info('Download complete', { metadata: { bytes: uint8Data.length, extension: fileExtension } });

    // Build metadata
    const metadata: Record<string, unknown> = {
      model: cleanModel,
      positivePrompt: result.positivePrompt,
      runware_cost: result.cost,
    };

    // Add content-specific metadata
    if (isVideo) {
      if (result.videoUUID) metadata.videoUUID = result.videoUUID;
      if (result.duration) metadata.duration = result.duration;
      if (result.fps) metadata.fps = result.fps;
    } else {
      if (result.imageUUID) metadata.imageUUID = result.imageUUID;
      if (result.NSFWContent !== undefined) metadata.nsfw_detected = result.NSFWContent;
      if (result.seed) metadata.seed = result.seed;
      if (result.steps) metadata.steps = result.steps;
      if (result.CFGScale) metadata.cfgScale = result.CFGScale;
      if (result.scheduler) metadata.scheduler = result.scheduler;
    }

    // Common metadata
    if (result.width) metadata.width = result.width;
    if (result.height) metadata.height = result.height;

    return {
      output_data: uint8Data,
      file_extension: fileExtension,
      file_size: uint8Data.length,
      metadata
    };

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Runware error', errorObj);
    throw new Error(`Runware provider failed: ${errorObj.message}`);
  }
}

function determineFileExtension(format: string, url: string, isVideo: boolean): string {
  const formatMap: Record<string, string> = {
    // Image formats
    'webp': 'webp',
    'png': 'png',
    'jpg': 'jpg',
    'jpeg': 'jpg',
    // Video formats
    'mp4': 'mp4',
    'webm': 'webm',
    'mov': 'mov'
  };

  if (formatMap[format.toLowerCase()]) {
    return formatMap[format.toLowerCase()];
  }

  // Try to extract from URL
  if (url) {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1];
  }

  // Default based on content type
  return isVideo ? 'mp4' : 'webp';
}
