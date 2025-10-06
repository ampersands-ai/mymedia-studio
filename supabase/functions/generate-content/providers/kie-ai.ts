import { ProviderRequest, ProviderResponse } from "./index.ts";

// Default parameters for flat-structure models
const FLAT_MODEL_DEFAULTS: Record<string, any> = {
  'veo3': {
    watermark: "",
    enableFallback: false,
    enableTranslation: true
  },
  'sora-2-text-to-video': {
    watermark: "",
    enableFallback: false,
    enableTranslation: true
  },
  'sora-2-image-to-video': {
    watermark: "",
    enableFallback: false,
    enableTranslation: true
  }
};

export async function callKieAI(request: ProviderRequest): Promise<ProviderResponse> {
  const KIE_AI_API_KEY = Deno.env.get('KIE_AI_API_KEY');
  
  if (!KIE_AI_API_KEY) {
    throw new Error('KIE_AI_API_KEY not configured. Please add it to your Supabase secrets.');
  }

  const baseUrl = 'https://api.kie.ai';
  const createTaskEndpoint = request.api_endpoint || '/api/v1/jobs/createTask';
  
  console.log('Calling Kie.ai API - Model:', request.model, 'Payload Structure:', request.payload_structure || 'wrapper', 'Endpoint:', createTaskEndpoint);

  // Build request payload with callback URL
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const callbackUrl = `${supabaseUrl}/functions/v1/kie-ai-webhook`;
  
  const useFlatStructure = request.payload_structure === 'flat';
  let payload: any;
  
  if (useFlatStructure) {
    // Flat structure for veo3, sora-2-*, etc.
    console.log('Using FLAT payload structure');
    const modelDefaults = FLAT_MODEL_DEFAULTS[request.model] || {};
    payload = {
      model: request.model,
      callBackUrl: callbackUrl,
      ...modelDefaults, // Inject defaults first
      prompt: request.prompt,
      ...request.parameters // User params can override if needed
    };
  } else {
    // Standard nested input structure for other models
    console.log('Using WRAPPER payload structure');
    payload = {
      model: request.model,
      callBackUrl: callbackUrl,
      input: {
        prompt: request.prompt,
        ...request.parameters
      }
    };
  }
  
  console.log('Callback URL:', callbackUrl);
  console.log('Full payload:', JSON.stringify(payload, null, 2));

  try {
    // Step 1: Create the task
    console.log('Creating Kie.ai task:', JSON.stringify(payload));
    
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
      console.error('Kie.ai task creation error:', createResponse.status, errorText);
      throw new Error(`Kie.ai task creation failed: ${createResponse.status} - ${errorText}`);
    }

    const createData = await createResponse.json();
    console.log('Task created:', createData);

    // Check response structure
    if (createData.code !== 200 || !createData.data?.taskId) {
      throw new Error(`Kie.ai task creation failed: ${createData.message || 'Unknown error'}`);
    }

    const taskId = createData.data.taskId;
    console.log('Task ID:', taskId);
    console.log('Task created successfully. Webhook will handle completion.');

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
    console.error('Kie.ai provider error:', error);
    throw new Error(`Kie.ai provider failed: ${error.message}`);
  }
}

function determineFileExtension(contentType: string, url: string): string {
  // Try to get extension from URL first
  if (url) {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1];
  }
  
  // Fallback to content type mapping
  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'text/plain': 'txt'
  };
  
  return mimeToExt[contentType.toLowerCase()] || 'png'; // Default to png for images
}
