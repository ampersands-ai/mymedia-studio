import { ProviderRequest, ProviderResponse } from "./index.ts";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function convertFrameImagesToRunwareFormat(
  frameImages: string[]
): Promise<Array<{inputImage: string}>> {
  const converted = [];
  
  for (const imageUrl of frameImages) {
    console.log('[Runware] Fetching frame image', { imageUrl: imageUrl.substring(0, 80) + '...' });

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

      console.log('[Runware] Converted frame image', { size_kb: Math.round(dataUri.length / 1024) });
      converted.push({ inputImage: dataUri });

    } catch (error: any) {
      console.error('[Runware] Failed to convert frame image', error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to convert frame image: ${error.message}`);
    }
  }
  
  return converted;
}

async function pollForVideoResult(
  taskUUID: string,
  apiKey: string,
  apiUrl: string
): Promise<any> {
  const maxAttempts = 8;
  const delays = [1500, 2500, 4000, 6000, 8000, 10000, 12000, 15000]; // ~60s total
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, delays[attempt]));

    console.log('[Runware] Polling for video result', { attempt: attempt + 1, maxAttempts, taskUUID });

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
      console.warn('[Runware] Poll request failed', { status: response.status, taskUUID });
      continue;
    }

    const result = await response.json();
    console.log('[Runware] Poll response received', { taskUUID });
    
    if (result.data) {
      for (const item of result.data) {
        if (item.taskUUID === taskUUID) {
          // Check for errors
          if (result.errors?.some((e: any) => e.taskUUID === taskUUID)) {
            const error = result.errors.find((e: any) => e.taskUUID === taskUUID);
            throw new Error(`Runware error: ${error.message || error.code}`);
          }
          
          // Check if complete with video URL
          if (item.status === "success" && item.videoURL) {
            console.log('[Runware] Video ready', { videoURL: item.videoURL, taskUUID });
            return item;
          }

          // Still processing
          if (item.status === "processing") {
            console.log('[Runware] Still processing', { taskUUID });
            break;
          }
        }
      }
    }
  }
  
  throw new Error("Video generation timed out after 60 seconds");
}

// Model-specific parameter restrictions
const MODEL_RESTRICTIONS: Record<string, string[]> = {
  'runware:110': ['outputFormat'], // Background removal only
};

function isParameterSupported(model: string, paramName: string): boolean {
  for (const [modelPrefix, unsupportedParams] of Object.entries(MODEL_RESTRICTIONS)) {
    if (model.startsWith(modelPrefix) && unsupportedParams.includes(paramName)) {
      return false;
    }
  }
  return true;
}

export async function callRunware(
  request: ProviderRequest
): Promise<ProviderResponse> {
  const RUNWARE_API_KEY = Deno.env.get('RUNWARE_API_KEY');
  
  if (!RUNWARE_API_KEY) {
    throw new Error('RUNWARE_API_KEY not configured');
  }

  const apiUrl = 'https://api.runware.ai/v1';
  
  // Generate unique task UUID
  const taskUUID = crypto.randomUUID();
  
  // Clean model ID (remove any trailing quotes or whitespace)
  const cleanModel = request.model.replace(/["'\s]+$/g, '');
  
  console.log('[Runware] Calling Runware API', { model: cleanModel, taskUUID, provider: 'runware' });

  // Determine task type from parameters or infer from model/params
  const taskType = request.parameters?.taskType || (request.parameters?.frameImages ? "videoInference" : "imageInference");
  const isVideo = taskType === "videoInference";

  console.log('[Runware] Task type determined', { taskType, isVideo, provider: 'runware' });

  // Build task payload with model-specific parameter filtering
  const params = request.parameters || {};
  const taskPayload: any = {
    taskType,
    taskUUID,
    model: cleanModel,
  };

  // Add parameters with model-specific filtering
  for (const [key, value] of Object.entries(params)) {
    if (isParameterSupported(cleanModel, key)) {
      taskPayload[key] = value;
    }
  }

  // Compute effective prompt with comprehensive fallbacks
  const effectivePrompt = (
    request.prompt?.trim() || 
    params.positivePrompt?.trim() || 
    params.prompt?.trim() || 
    ''
  );

  // Strict validation
  if (!effectivePrompt || effectivePrompt.length < 2) {
    console.error('[Runware] Missing prompt', { hasRequestPrompt: !!request.prompt, hasParamsPrompt: !!params.positivePrompt });
    throw new Error('Missing required parameter: positivePrompt');
  }

  // Ensure positivePrompt is set
  taskPayload.positivePrompt = effectivePrompt;
  
  // Ensure duration is always an integer for video tasks
  if (isVideo && taskPayload.duration !== undefined) {
    taskPayload.duration = Math.round(Number(taskPayload.duration));
  }

  // Convert frameImages to Runware format for video tasks
  if (isVideo && taskPayload.frameImages !== undefined) {
    console.log('[Runware] Converting frame images', { frameCount: taskPayload.frameImages.length });
    taskPayload.frameImages = await convertFrameImagesToRunwareFormat(taskPayload.frameImages);
  }

  // Add uploadEndpoint for direct upload to storage (if provided by caller)
  if (isVideo && request.uploadEndpoint) {
    taskPayload.uploadEndpoint = request.uploadEndpoint;
    console.log('[Runware] Using uploadEndpoint for direct storage upload');
  }

  console.log('[Runware] Final task payload', { 
    model: cleanModel,
    taskUUID,
    parameterKeys: Object.keys(taskPayload),
    hasOutputFormat: !!taskPayload.outputFormat,
    hasOutputQuality: !!taskPayload.outputQuality,
    hasProviderSettings: !!taskPayload.providerSettings,
    providerSettingsType: typeof taskPayload.providerSettings,
    providerSettingsKeys: taskPayload.providerSettings ? Object.keys(taskPayload.providerSettings) : [],
    isVideo,
    fullPayload: JSON.stringify(taskPayload, null, 2)
  });

  // Build request payload with authentication and task
  const requestBody = [
    {
      taskType: "authentication",
      apiKey: RUNWARE_API_KEY
    },
    taskPayload
  ];

  console.log('[Runware] Calling Runware API', { apiUrl, taskUUID, model: cleanModel });

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
      console.error('[Runware] API error', { status: response.status, error: errorText, taskUUID });
      
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
    console.log('[Runware] Runware response received', { taskUUID });

    // Check for errors in response
    if (responseData.errors && responseData.errors.length > 0) {
      const error = responseData.errors[0];
      console.error('[Runware] Runware provider error', { error: error.message || error.code, model: cleanModel, taskUUID });
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
    const inferenceResult = responseData.data?.find((item: any) => 
      item.taskUUID === taskUUID && (item.imageURL || item.imageUUID || item.videoURL)
    );
    
    if (!inferenceResult) {
      console.error('[Runware] No inference result', { 
        responseData: JSON.stringify(responseData).substring(0, 500),
        taskUUID 
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
      console.log('[Runware] No immediate video URL - starting polling', { taskUUID });
      const polledResult = await pollForVideoResult(taskUUID, RUNWARE_API_KEY, apiUrl);
      contentUrl = polledResult.videoURL;

      if (!contentUrl) {
        throw new Error("No video URL after polling");
      }
    } else if (!contentUrl) {
      throw new Error(`No ${isVideo ? 'video' : 'image'} URL in Runware response`);
    }

    console.log('[Runware] Generated content URL received', { contentType: isVideo ? 'video' : 'image', url: contentUrl.substring(0, 100), taskUUID });

    // Download the content
    const contentResponse = await fetch(contentUrl);
    if (!contentResponse.ok) {
      throw new Error(`Failed to download ${isVideo ? 'video' : 'image'}: ${contentResponse.status}`);
    }

    const contentData = await contentResponse.arrayBuffer();
    const uint8Data = new Uint8Array(contentData);

    // Determine file extension
    const outputFormat = taskPayload.outputFormat?.toLowerCase() || (isVideo ? 'mp4' : 'webp');
    const fileExtension = determineFileExtension(outputFormat, contentUrl, isVideo);

    console.log('[Runware] Content downloaded successfully', { size_bytes: uint8Data.length, extension: fileExtension, taskUUID });

    // Build metadata
    const metadata: Record<string, any> = {
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

  } catch (error: any) {
    console.error('[Runware] Runware provider error', { error: error.message, model: cleanModel, taskUUID });
    throw new Error(`Runware provider failed: ${error.message}`);
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
