export interface ProviderRequest {
  model: string;
  prompt: string;
  parameters: Record<string, any>;
  api_endpoint?: string;
  payload_structure?: string;
  userId?: string; // For storage path generation
  generationId?: string; // For storage path generation
  supabase?: any; // Supabase client for presigned URLs
}

export interface ProviderResponse {
  output_data: Uint8Array;
  file_extension: string;
  file_size: number;
  metadata: Record<string, any>;
  storage_path?: string; // Optional: indicates content already uploaded to storage
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function convertFrameImagesToRunwareFormat(frameImages: string[]): Promise<Array<{inputImage: string}>> {
  const converted = [];
  
  for (const imageUrl of frameImages) {
    webhookLogger.info('[Runware Video] Fetching frame image', { url: imageUrl.substring(0, 80) });
    
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
      
      webhookLogger.info('[Runware Video] Frame converted', { sizeKB: Math.round(dataUri.length / 1024) });
      converted.push({ inputImage: dataUri });
      
    } catch (error: any) {
      webhookLogger.error('[Runware Video] Frame conversion failed', error.message, { error: error.message });
      throw new Error(`Failed to convert frame image: ${error.message}`);
    }
  }
  
  return converted;
}

async function pollForVideoResult(taskUUID: string, apiKey: string, apiUrl: string): Promise<any> {
  const maxAttempts = 8;
  const delays = [1500, 2500, 4000, 6000, 8000, 10000, 12000, 15000]; // ~60s total
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    
    webhookLogger.info('[Runware Poll] Poll attempt', { attempt: attempt + 1, maxAttempts, taskUUID });
    
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
      console.error('[Runware Poll] HTTP error', `HTTP ${response.status}`, { status: response.status });
      continue;
    }
    
    const result = await response.json();
    console.log('[Runware Poll] Response received', { result });
    
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
            webhookLogger.info('[Runware Poll] Video ready', { videoURL: item.videoURL });
            return item;
          }
          
          // Still processing
          if (item.status === "processing") {
            webhookLogger.info('[Runware Poll] Still processing');
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
  
  // Clean model ID
  const cleanModel = request.model.replace(/["'\s]+$/g, '');
  
  webhookLogger.info('[Runware] API call starting', { model: cleanModel, taskUUID });

  // Normalize numeric parameters
  const params = request.parameters || {};
  
  // Compute effective prompt with fallbacks
  const effectivePrompt = (
    request.prompt || 
    params.positivePrompt || 
    params.prompt || 
    ''
  ).trim();
  
  // Validate prompt length (Runware requires 2-3000 characters)
  if (!effectivePrompt || effectivePrompt.length < 2) {
    throw new Error('Prompt is required and must be at least 2 characters.');
  }
  if (effectivePrompt.length > 3000) {
    throw new Error('Prompt must be less than 3000 characters.');
  }
  
  webhookLogger.info('[Runware] Prompt', { prompt: effectivePrompt.substring(0, 100), truncated: effectivePrompt.length > 100 });
  
  // Determine task type from parameters or infer from model/params
  const taskType = params.taskType || (params.frameImages ? "videoInference" : "imageInference");
  const isVideo = taskType === "videoInference";
  
  webhookLogger.info('[Runware] Task configuration', { taskType, isVideo });
  
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
      webhookLogger.error('[Runware Video] Presigned URL creation failed', signedError.message, { error: signedError });
      // Continue without uploadEndpoint as fallback
    } else {
      presignedUrl = signedData.signedUrl;
      webhookLogger.info('[Runware Video] Presigned URL generated', { storagePath });
    }
  }
  
  // Build task payload - trust validated parameters from schema
  const taskPayload: any = {
    taskType,
    taskUUID,
    model: cleanModel,
    positivePrompt: effectivePrompt,
  };

  // Common parameters
  if (params.width !== undefined) taskPayload.width = Number(params.width);
  if (params.height !== undefined) taskPayload.height = Number(params.height);
  if (params.numberResults !== undefined) taskPayload.numberResults = Number(params.numberResults);
  if (params.outputFormat !== undefined) taskPayload.outputFormat = params.outputFormat;
  if (params.outputQuality !== undefined) taskPayload.outputQuality = Number(params.outputQuality);
  taskPayload.includeCost = params.includeCost ?? true;

  // Image-specific parameters
  if (!isVideo) {
    if (params.outputType !== undefined) taskPayload.outputType = params.outputType;
    if (params.steps !== undefined) taskPayload.steps = Number(params.steps);
    if (params.CFGScale !== undefined) taskPayload.CFGScale = Number(params.CFGScale);
    if (params.scheduler !== undefined) taskPayload.scheduler = params.scheduler;
    if (params.seed !== undefined) taskPayload.seed = Number(params.seed);
    if (params.strength !== undefined) taskPayload.strength = Number(params.strength);
    if (params.lora !== undefined) taskPayload.lora = params.lora;
    taskPayload.checkNSFW = params.checkNSFW ?? true;
  }
  
  // Video-specific parameters
  if (isVideo) {
    if (params.fps !== undefined) taskPayload.fps = Number(params.fps);
    if (params.duration !== undefined) taskPayload.duration = Math.round(Number(params.duration));
    if (params.frameImages !== undefined) {
      webhookLogger.info('[Runware Video] Converting frames', { count: params.frameImages.length });
      taskPayload.frameImages = await convertFrameImagesToRunwareFormat(params.frameImages);
    }
    if (params.providerSettings !== undefined) taskPayload.providerSettings = params.providerSettings;
    
    // Add uploadEndpoint for direct upload to storage
    if (presignedUrl) {
      taskPayload.uploadEndpoint = presignedUrl;
      webhookLogger.info('[Runware Video] Using direct storage upload');
    }
  }

  // Build request payload with authentication and task
  const requestBody = [
    {
      taskType: "authentication",
      apiKey: RUNWARE_API_KEY
    },
    taskPayload
  ];

  // Redact API key in logs for security
  const logSafeRequestBody = requestBody.map(task => {
    if (task.taskType === 'authentication') {
      return { ...task, apiKey: '***' };
    }
    return task;
  });
  
  webhookLogger.info('[Runware] Request body', { body: logSafeRequestBody });

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
    webhookLogger.info('[Runware] Response received', { data: responseData });

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

    // Find the result (imageInference or videoInference)
    const result = responseData.data.find((item: any) => 
      item.taskType === 'imageInference' || item.taskType === 'videoInference'
    );
    
    if (!result) {
      throw new Error('No inference result in Runware response');
    }

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
      webhookLogger.info('[Runware Video] Starting polling');
      const polledResult = await pollForVideoResult(taskUUID, RUNWARE_API_KEY, apiUrl);
      contentUrl = polledResult.videoURL;
      
      if (!contentUrl) {
        throw new Error("No video URL after polling");
      }
    } else if (!contentUrl) {
      throw new Error(`No ${isVideo ? 'video' : 'image'} URL in Runware response`);
    }

    webhookLogger.info('[Runware] Content URL generated', { isVideo, url: contentUrl });

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

    webhookLogger.info('[Runware] Download complete', { bytes: uint8Data.length, extension: fileExtension });

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
    webhookLogger.error('[Runware] Error', error.message, { error });
    throw new Error(`Runware provider failed: ${error.message}`);
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
