import { ProviderRequest, ProviderResponse } from "./index.ts";
import { EdgeLogger } from "../../_shared/edge-logger.ts";

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
    logger.info('Fetching frame image', { 
      metadata: { imageUrl: imageUrl.substring(0, 80) + '...' } 
    });
    
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
      
      logger.info('Converted frame image', { 
        metadata: { size_kb: Math.round(dataUri.length / 1024) } 
      });
      converted.push({ inputImage: dataUri });
      
    } catch (error: any) {
      logger.error('Failed to convert frame image', error);
      throw new Error(`Failed to convert frame image: ${error.message}`);
    }
  }
  
  return converted;
}

async function pollForVideoResult(
  taskUUID: string, 
  apiKey: string, 
  apiUrl: string, 
  logger: EdgeLogger
): Promise<any> {
  const maxAttempts = 8;
  const delays = [1500, 2500, 4000, 6000, 8000, 10000, 12000, 15000]; // ~60s total
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    
    logger.info('Polling for video result', { 
      metadata: { attempt: attempt + 1, maxAttempts, taskUUID } 
    });
    
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
      logger.warn('Poll request failed', { 
        metadata: { status: response.status, taskUUID } 
      });
      continue;
    }
    
    const result = await response.json();
    logger.debug('Poll response received', { metadata: { result } });
    
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
            logger.info('Video ready', { metadata: { videoURL: item.videoURL, taskUUID } });
            return item;
          }
          
          // Still processing
          if (item.status === "processing") {
            logger.debug('Still processing', { metadata: { taskUUID } });
            break;
          }
        }
      }
    }
  }
  
  throw new Error("Video generation timed out after 60 seconds");
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
  
  logger.info('Calling Runware API', { metadata: { model: cleanModel, taskUUID, provider: 'runware' } });

  // Determine task type from parameters or infer from model/params
  const taskType = request.parameters?.taskType || (request.parameters?.frameImages ? "videoInference" : "imageInference");
  const isVideo = taskType === "videoInference";
  
  logger.info('Task type determined', { metadata: { taskType, isVideo, provider: 'runware' } });

  // uploadEndpoint is provided by main edge function if needed for video direct upload

  // Build task payload with proper parameter mapping
  const taskPayload: any = {
    taskType,
    taskUUID,
    model: cleanModel,
    ...request.parameters,
  };

  // Ensure positivePrompt is set from prompt if not in parameters
  if (request.prompt && !taskPayload.positivePrompt) {
    taskPayload.positivePrompt = request.prompt;
  }
  
  // Ensure duration is always an integer for video tasks
  if (isVideo && taskPayload.duration !== undefined) {
    taskPayload.duration = Math.round(Number(taskPayload.duration));
  }

  // Convert frameImages to Runware format for video tasks
  if (isVideo && taskPayload.frameImages !== undefined) {
    logger.info('Converting frame images', { 
      metadata: { frameCount: taskPayload.frameImages.length } 
    });
    taskPayload.frameImages = await convertFrameImagesToRunwareFormat(taskPayload.frameImages, logger);
  }

  // Add uploadEndpoint for direct upload to storage (if provided by caller)
  if (isVideo && request.uploadEndpoint) {
    taskPayload.uploadEndpoint = request.uploadEndpoint;
    logger.debug('Using uploadEndpoint for direct storage upload');
  }

  logger.debug('Task payload constructed', { 
    metadata: { payload: JSON.stringify(taskPayload).substring(0, 500) } 
  });

  // Build request payload with authentication and task
  const requestBody = [
    {
      taskType: "authentication",
      apiKey: RUNWARE_API_KEY
    },
    taskPayload
  ];

  logger.debug('Calling Runware API', { 
    metadata: { apiUrl, taskUUID, model: cleanModel } 
  });

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
      logger.error('Runware API error', undefined, { 
        metadata: { status: response.status, error: errorText, taskUUID } 
      });
      
      // Parse error for better user messaging
      let errorMessage = `Runware API failed: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errors?.[0]?.message) {
          errorMessage = errorData.errors[0].message;
        }
      } catch {
        // Use status text if JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    logger.info('Runware response received', { metadata: { taskUUID } });

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

    // Find the result (imageInference, videoInference, or background removal tasks)
    const result = responseData.data.find((item: any) => 
      item.taskType === 'imageInference' || 
      item.taskType === 'videoInference' ||
      item.taskType === 'imageBackgroundRemoval' ||
      item.taskType === 'videoBackgroundRemoval'
    );
    
    if (!result) {
      logger.error('No result in Runware response', undefined, { 
        metadata: { 
          availableTaskTypes: responseData.data.map((d: any) => d.taskType), 
          taskUUID 
        } 
      });
      throw new Error('No result in Runware response');
    }

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
      const polledResult = await pollForVideoResult(taskUUID, RUNWARE_API_KEY, apiUrl, logger);
      contentUrl = polledResult.videoURL;
      
      if (!contentUrl) {
        throw new Error("No video URL after polling");
      }
    } else if (!contentUrl) {
      throw new Error(`No ${isVideo ? 'video' : 'image'} URL in Runware response`);
    }

    logger.info('Generated content URL received', { 
      metadata: { contentType: isVideo ? 'video' : 'image', url: contentUrl.substring(0, 100), taskUUID } 
    });

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

    logger.info('Content downloaded successfully', { 
      metadata: { size_bytes: uint8Data.length, extension: fileExtension, taskUUID } 
    });

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
    logger.error('Runware provider error', error, { metadata: { model: cleanModel, taskUUID } });
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
