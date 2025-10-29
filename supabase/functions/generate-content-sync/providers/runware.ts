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
  
  // Clean model ID (remove any trailing quotes or whitespace)
  const cleanModel = request.model.replace(/["'\s]+$/g, '');
  
  console.log('[Runware] Calling API - Model:', cleanModel);

  // Build task payload with proper parameter mapping
  const taskPayload: any = {
    taskType: "imageInference",
    model: cleanModel,
    ...request.parameters,
  };

  // Ensure positivePrompt is set from prompt if not in parameters
  if (request.prompt && !taskPayload.positivePrompt) {
    taskPayload.positivePrompt = request.prompt;
  }

  console.log('[Runware] Task payload:', JSON.stringify(taskPayload, null, 2));

  try {
    // Call Runware API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([taskPayload])
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Runware] API error:', response.status, errorText);
      
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
    console.log('[Runware] Response received:', JSON.stringify(responseData, null, 2));

    // Validate response structure
    if (!Array.isArray(responseData) || responseData.length === 0) {
      throw new Error('Invalid response from Runware API');
    }

    const result = responseData[0];

    // Check for errors
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
    const outputFormat = taskPayload.outputFormat?.toLowerCase() || 'webp';
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
