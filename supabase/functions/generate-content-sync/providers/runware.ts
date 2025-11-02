export interface ProviderRequest {
  model: string;
  prompt: string;
  parameters: Record<string, any>;
  api_endpoint?: string;
  payload_structure?: string;
}

export interface ProviderResponse {
  output_data: Uint8Array;
  file_extension: string;
  file_size: number;
  metadata: Record<string, any>;
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
  
  console.log('[Runware] Calling API - Model:', cleanModel, 'TaskUUID:', taskUUID);

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
  
  console.log('[Runware] Using prompt:', effectivePrompt.substring(0, 100) + (effectivePrompt.length > 100 ? '...' : ''));
  
  // Build task payload - trust validated parameters from schema
  const taskPayload: any = {
    taskType: "imageInference",
    taskUUID,
    model: cleanModel,
    positivePrompt: effectivePrompt,
  };

  // Only include parameters that exist in validated params (schema defaults already applied)
  if (params.width !== undefined) taskPayload.width = Number(params.width);
  if (params.height !== undefined) taskPayload.height = Number(params.height);
  if (params.numberResults !== undefined) taskPayload.numberResults = Number(params.numberResults);
  if (params.outputFormat !== undefined) taskPayload.outputFormat = params.outputFormat;
  if (params.outputType !== undefined) taskPayload.outputType = params.outputType;
  if (params.steps !== undefined) taskPayload.steps = Number(params.steps);
  if (params.CFGScale !== undefined) taskPayload.CFGScale = Number(params.CFGScale);
  if (params.scheduler !== undefined) taskPayload.scheduler = params.scheduler;
  if (params.outputQuality !== undefined) taskPayload.outputQuality = Number(params.outputQuality);
  if (params.seed !== undefined) taskPayload.seed = Number(params.seed);
  if (params.strength !== undefined) taskPayload.strength = Number(params.strength);
  if (params.lora !== undefined) taskPayload.lora = params.lora;

  // These can have reasonable defaults if missing
  taskPayload.checkNSFW = params.checkNSFW ?? true;
  taskPayload.includeCost = params.includeCost ?? true;

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
  
  console.log('[Runware] Request body:', JSON.stringify(logSafeRequestBody, null, 2));

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
    console.log('[Runware] Response received:', JSON.stringify(responseData, null, 2));

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

    // Find the imageInference result (skip authentication result)
    const result = responseData.data.find((item: any) => item.taskType === 'imageInference');
    
    if (!result) {
      throw new Error('No image inference result in Runware response');
    }

    // Check for errors in result
    if (result.error) {
      throw new Error(`Runware generation failed: ${result.error}`);
    }

    // Extract image URL
    const imageUrl = result.imageURL;
    if (!imageUrl) {
      throw new Error('No image URL in Runware response');
    }

    console.log('[Runware] Generated image URL:', imageUrl);

    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.arrayBuffer();
    const uint8Data = new Uint8Array(imageData);

    // Determine file extension
    const outputFormat = params.outputFormat?.toLowerCase() || 'webp';
    const fileExtension = determineFileExtension(outputFormat, imageUrl);

    console.log(`[Runware] Downloaded: ${uint8Data.length} bytes, extension: ${fileExtension}`);

    // Build metadata
    const metadata: Record<string, any> = {
      model: cleanModel,
      imageUUID: result.imageUUID,
      positivePrompt: result.positivePrompt,
      runware_cost: result.cost,
      nsfw_detected: result.NSFWContent || false,
    };

    // Include optional fields
    if (result.seed) metadata.seed = result.seed;
    if (result.width) metadata.width = result.width;
    if (result.height) metadata.height = result.height;
    if (result.steps) metadata.steps = result.steps;
    if (result.CFGScale) metadata.cfgScale = result.CFGScale;
    if (result.scheduler) metadata.scheduler = result.scheduler;

    return {
      output_data: uint8Data,
      file_extension: fileExtension,
      file_size: uint8Data.length,
      metadata
    };

  } catch (error: any) {
    console.error('[Runware] Error:', error);
    throw new Error(`Runware provider failed: ${error.message}`);
  }
}

function determineFileExtension(format: string, url: string): string {
  const formatMap: Record<string, string> = {
    'webp': 'webp',
    'png': 'png',
    'jpg': 'jpg',
    'jpeg': 'jpg'
  };

  if (formatMap[format.toLowerCase()]) {
    return formatMap[format.toLowerCase()];
  }

  // Try to extract from URL
  if (url) {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1];
  }

  return 'webp';
}
