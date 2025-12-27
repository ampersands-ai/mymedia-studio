import { ProviderRequest, ProviderResponse } from "./index.ts";
import { GENERATION_STATUS } from "../../_shared/constants.ts";
import { EdgeLogger } from "../../_shared/edge-logger.ts";
import { API_ENDPOINTS } from "../../_shared/api-endpoints.ts";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function convertFrameImagesToRunwareFormat(
  frameImages: string[],
  logger: EdgeLogger
): Promise<Array<{inputImage: string}>> {
  const converted = [];

  for (const imageUrl of frameImages) {
    logger.info('Fetching frame image', { metadata: { imageUrl: imageUrl.substring(0, 80) } });

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

      logger.info('Converted frame image', { metadata: { size_kb: Math.round(dataUri.length / 1024) } });
      converted.push({ inputImage: dataUri });

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to convert frame image', errorObj);
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

async function pollForVideoResult(
  taskUUID: string,
  apiKey: string,
  apiUrl: string,
  logger: EdgeLogger
): Promise<RunwareVideoResult> {
  const maxAttempts = 8;
  const delays = [1500, 2500, 4000, 6000, 8000, 10000, 12000, 15000]; // ~60s total

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, delays[attempt]));

    logger.info('Polling for video result', { metadata: { attempt: attempt + 1, maxAttempts, taskUUID } });

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
      logger.warn('Poll request failed', { metadata: { status: response.status, taskUUID } });
      continue;
    }

    const result = await response.json();
    logger.info('Poll response received', { metadata: { taskUUID } });

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
            logger.info('Video ready', { metadata: { videoURL: item.videoURL.substring(0, 80), taskUUID } });
            return item;
          }

          // Still processing
          if (item.status === GENERATION_STATUS.PROCESSING) {
            logger.info('Still processing', { metadata: { taskUUID } });
            break;
          }
        }
      }
    }
  }

  throw new Error("Video generation timed out after 60 seconds");
}

/**
 * Runware Provider Implementation
 *
 * NOTE: All model-specific parameter preprocessing (prompt->positivePrompt, outputFormat defaults, etc.)
 * should be handled in individual model .ts files via preparePayload() functions.
 * This provider is a dumb transport layer that calls the Runware API.
 *
 * Example: Runware image models handle prompt->positivePrompt mapping in their own .ts files.
 * Example: Runware video models set outputFormat='MP4' in their own .ts files.
 */

export async function callRunware(request: ProviderRequest): Promise<ProviderResponse> {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('runware-provider', requestId);

  logger.info('Runware call started', { metadata: { model: request.model } });

  const API_KEY = Deno.env.get('RUNWARE_API_KEY');
  if (!API_KEY) {
    throw new Error('RUNWARE_API_KEY not configured');
  }

  const apiUrl = API_ENDPOINTS.RUNWARE.fullUrl;

  // Generate unique task UUID
  const taskUUID = crypto.randomUUID();

  // Clean model ID (remove any trailing quotes or whitespace)
  const cleanModel = request.model.replace(/["'\s]+$/g, '');

  // Extract prompt from parameters ONLY (never from top-level)
  const prompt = request.parameters.prompt ||
                request.parameters.positivePrompt ||
                request.parameters.positive_prompt ||
                '';

  logger.info('Prompt extraction', { metadata: {
    hasPrompt: !!prompt,
    promptLength: typeof prompt === 'string' ? prompt.length : 0
  }});

  logger.info('Calling Runware API', { metadata: { model: cleanModel, taskUUID, provider: 'runware' } });

  // Determine task type from parameters or infer from model/params
  const taskType = request.parameters?.taskType || (request.parameters?.frameImages ? "videoInference" : "imageInference");
  const isVideo = taskType === "videoInference";

  logger.info('Task type determined', { metadata: { taskType, isVideo, provider: 'runware' } });

  // Get schema properties (what fields this model actually accepts)
  const schemaProperties = request.input_schema?.properties || {};
  const requiredFields = request.input_schema?.required || [];

  // Build task payload dynamically from schema
  const params = request.parameters || {};
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
  
  // CRITICAL: Always include width/height from parameters if provided
  // These are essential Runware API fields that may not be in schema
  // (frontend converts aspectRatio -> width/height in preparePayload)
  if (params.width !== undefined) {
    taskPayload.width = params.width;
  }
  if (params.height !== undefined) {
    taskPayload.height = params.height;
  }

  // Handle prompt fields dynamically (prompt, positivePrompt, positive_prompt)
  const promptAliases = ['prompt', 'positivePrompt', 'positive_prompt'];
  const promptField = promptAliases.find(alias => schemaProperties[alias]);

  if (promptField) {
    // Check if this model's schema requires a prompt
    const isPromptRequired = (requiredFields as string[]).includes(promptField);
    
    // Get effective prompt value from parameters only
    const promptValue = params[promptField];
    const effectivePrompt = typeof promptValue === 'string' ? promptValue.trim() : '';
    
    // Validate ONLY if schema says it's required
    if (isPromptRequired && (!effectivePrompt || effectivePrompt.length < 2)) {
      logger.error('Missing required prompt', new Error(`Missing required parameter: ${promptField}`), {
        metadata: {
          promptField,
          isRequired: isPromptRequired,
          hasParamsPrompt: !!params[promptField]
        }
      });
      throw new Error(`Missing required parameter: ${promptField}`);
    }
    
    // Set prompt if we have a value
    if (effectivePrompt) {
      taskPayload[promptField] = effectivePrompt;
    }
  }
  
  // Ensure duration is always an integer for video tasks
  if (isVideo && taskPayload.duration !== undefined) {
    taskPayload.duration = Math.round(Number(taskPayload.duration));
  }

  // Convert frameImages to Runware format for video tasks
  if (isVideo && taskPayload.frameImages !== undefined && taskPayload.frameImages !== null) {
    const frameImages = taskPayload.frameImages as string[];
    logger.info('Converting frame images', { metadata: { frameCount: frameImages.length } });
    taskPayload.frameImages = await convertFrameImagesToRunwareFormat(frameImages, logger);
  }

  // Add uploadEndpoint for direct upload to storage (if provided by caller)
  if (isVideo && request.uploadEndpoint) {
    taskPayload.uploadEndpoint = request.uploadEndpoint;
    logger.info('Using uploadEndpoint for direct storage upload');
  }

  logger.info('Final task payload', {
    metadata: {
      model: cleanModel,
      taskUUID,
      parameterKeys: Object.keys(taskPayload),
      hasOutputFormat: !!taskPayload.outputFormat,
      hasOutputQuality: !!taskPayload.outputQuality,
      hasProviderSettings: !!taskPayload.providerSettings,
      providerSettingsType: typeof taskPayload.providerSettings,
      providerSettingsKeys: taskPayload.providerSettings ? Object.keys(taskPayload.providerSettings) : [],
      isVideo,
      // SECURITY: Never log full payload as it may contain PII (user prompts, etc.)
      payloadSize: JSON.stringify(taskPayload).length
    }
  });

  // Build request payload with authentication and task
  const requestBody = [
    {
      taskType: "authentication",
      apiKey: API_KEY
    },
    taskPayload
  ];

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

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('API error', new Error(`API error: ${response.status}`), {
        metadata: { status: response.status, error: errorText.substring(0, 200), taskUUID }
      });
      
      // Parse error for better user messaging
      let errorMessage = `Runware API failed: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errors?.[0]?.message) {
          errorMessage = `Runware error: ${errorData.errors[0].message}`;
        } else if (errorData.errors?.[0]?.code) {
          errorMessage = `Runware error: ${errorData.errors[0].code}`;
        }
      } catch {
        // Use status text if JSON parsing fails
        errorMessage = `Runware API error: ${response.statusText || response.status}`;
      }
      
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    logger.info('Runware response received', { metadata: { taskUUID } });

    // Check for errors in response
    if (responseData.errors && responseData.errors.length > 0) {
      const error = responseData.errors[0];
      logger.error('Runware provider error', new Error(error.message || error.code), {
        metadata: { error: error.message || error.code, model: cleanModel, taskUUID }
      });
      throw new Error(`Runware provider failed: ${error.message || error.code}`);
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

    // Check for errors
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
      logger.info('No immediate video URL - starting polling', { metadata: { taskUUID } });
      const polledResult = await pollForVideoResult(taskUUID, API_KEY, apiUrl, logger);
      contentUrl = polledResult.videoURL;

      if (!contentUrl) {
        throw new Error("No video URL after polling");
      }
    } else if (!contentUrl) {
      throw new Error(`No ${isVideo ? 'video' : 'image'} URL in Runware response`);
    }

    logger.info('Generated content URL received', { metadata: { contentType: isVideo ? 'video' : 'image', url: contentUrl.substring(0, 100), taskUUID } });

    // Download the content
    const contentResponse = await fetch(contentUrl);
    if (!contentResponse.ok) {
      throw new Error(`Failed to download ${isVideo ? 'video' : 'image'}: ${contentResponse.status}`);
    }

    const contentData = await contentResponse.arrayBuffer();
    const uint8Data = new Uint8Array(contentData);

    // Determine file extension
    const outputFormat = (taskPayload.outputFormat as string | undefined)?.toLowerCase() || (isVideo ? 'mp4' : 'webp');
    const fileExtension = determineFileExtension(outputFormat, contentUrl, isVideo);

    logger.info('Content downloaded successfully', { metadata: { size_bytes: uint8Data.length, extension: fileExtension, taskUUID } });

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
    logger.error('Runware provider error', errorObj, {
      metadata: { model: cleanModel, taskUUID }
    });
    throw new Error(`Runware provider failed: ${errorObj.message}`);
  }
}

function determineFileExtension(format: string, url: string, isVideo: boolean): string {
  // Try to get extension from format first
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
