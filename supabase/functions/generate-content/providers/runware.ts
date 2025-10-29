import { ProviderRequest, ProviderResponse } from "./index.ts";

export async function callRunware(
  request: ProviderRequest
): Promise<ProviderResponse> {
  const RUNWARE_API_KEY = Deno.env.get('RUNWARE_API_KEY');
  
  if (!RUNWARE_API_KEY) {
    throw new Error('RUNWARE_API_KEY not configured. Please add it to your Supabase secrets.');
  }

  const apiUrl = 'https://api.runware.ai/v1';
  
  console.log('Calling Runware API - Model:', request.model);
  console.log('Parameters:', JSON.stringify(request.parameters, null, 2));

  // Runware uses flat structure with array payload
  // Build the task payload
  const taskPayload: any = {
    ...request.parameters,
  };

  // Add positivePrompt from request.prompt if not already in parameters
  if (request.prompt && !taskPayload.positivePrompt) {
    taskPayload.positivePrompt = request.prompt;
  }

  // Ensure model is included if it's in the schema but not in parameters
  if (request.parameters.model) {
    taskPayload.model = request.parameters.model;
  }

  console.log('Full task payload:', JSON.stringify(taskPayload, null, 2));

  try {
    // Call Runware API with Bearer token auth
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
      console.error('Runware API error:', response.status, errorText);
      throw new Error(`Runware API failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Runware response:', JSON.stringify(responseData, null, 2));

    // Runware returns array with results
    if (!Array.isArray(responseData) || responseData.length === 0) {
      throw new Error('Invalid response from Runware API: Expected array with results');
    }

    const result = responseData[0];

    // Check for errors in response
    if (result.error) {
      throw new Error(`Runware generation failed: ${result.error}`);
    }

    // Extract the image URL from the response
    const imageUrl = result.imageURL;
    if (!imageUrl) {
      throw new Error('No image URL in Runware response');
    }

    console.log('Generated image URL:', imageUrl);

    // Download the generated image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from Runware: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.arrayBuffer();
    const uint8Data = new Uint8Array(imageData);

    // Determine file extension from output format or URL
    const outputFormat = taskPayload.outputFormat?.toLowerCase() || 'webp';
    const fileExtension = determineFileExtension(outputFormat, imageUrl);

    console.log(`Downloaded image: ${uint8Data.length} bytes, extension: ${fileExtension}`);

    // Build metadata from response
    const metadata: Record<string, any> = {
      model: request.model,
      imageUUID: result.imageUUID,
      positivePrompt: result.positivePrompt,
      runware_cost: result.cost,
      nsfw_detected: result.NSFWContent || false,
    };

    // Include optional fields if present
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
    console.error('Runware provider error:', error);
    throw new Error(`Runware provider failed: ${error.message}`);
  }
}

function determineFileExtension(format: string, url: string): string {
  // Try to get extension from format first
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

  // Default to webp
  return 'webp';
}
