import type { ProviderRequest, ProviderResponse } from "./index.ts";
import { EdgeLogger } from "../../_shared/edge-logger.ts";

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function callLovableAI(request: ProviderRequest): Promise<ProviderResponse> {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('lovable-ai-provider', requestId);

  logger.info('Starting image generation', { metadata: { model: request.model } });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const MODEL_MAP: Record<string, string> = {
    "lovable-ai-gemini-flash-image": "google/gemini-2.5-flash-image",
    "lovable-ai-gemini-flash": "google/gemini-2.5-flash",
    "lovable-ai-gemini-pro": "google/gemini-2.5-pro",
    "lovable-ai-gemini-flash-lite": "google/gemini-2.5-flash-lite"
  };

  const resolvedModel = (request.model && MODEL_MAP[request.model])
    ? MODEL_MAP[request.model]
    : (request.model || "google/gemini-2.5-flash-image");

  // Extract prompt from parameters ONLY (never from top-level)
  const promptField = request.parameters.prompt || 
                     request.parameters.positivePrompt || 
                     request.parameters.positive_prompt || 
                     '';
  
  if (!promptField) {
    throw new Error('No prompt provided in parameters');
  }

  const payload = {
    model: resolvedModel,
    messages: [
      {
        role: "user",
        content: promptField
      }
    ],
    modalities: ["image", "text"]
  };
  logger.info('Request payload prepared', {
    metadata: {
      model: payload.model,
      promptLength: promptField.length,
      parameters: Object.keys(request.parameters)
    }
  });

  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('API error', new Error(`API error: ${response.status}`), {
      metadata: {
        status: response.status,
        error: errorText.substring(0, 200)
      }
    });
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    if (response.status === 402) {
      throw new Error('Insufficient credits. Please add more credits to continue.');
    }
    
    throw new Error(`Lovable AI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  logger.info('Response received', {
    metadata: {
      hasChoices: !!result.choices,
      choicesCount: result.choices?.length
    }
  });

  // Extract base64 image from response
  const images = result.choices?.[0]?.message?.images;
  if (!images?.[0]?.image_url?.url) {
    throw new Error('No image data in Lovable AI response');
  }

  const base64Data = images[0].image_url.url;
  if (!base64Data.startsWith('data:image/')) {
    throw new Error('Invalid image data format');
  }

  // Extract base64 string (remove data:image/png;base64, prefix)
  const base64String = base64Data.split(',')[1];
  if (!base64String) {
    throw new Error('Failed to extract base64 data');
  }

  // Decode base64 to binary
  const binaryString = atob(base64String);
  const uint8Data = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    uint8Data[i] = binaryString.charCodeAt(i);
  }

  logger.info('Image decoded', {
    metadata: {
      size_bytes: uint8Data.length,
      size_kb: Math.round(uint8Data.length / 1024)
    }
  });

  return {
    output_data: uint8Data,
    file_extension: "png",
    file_size: uint8Data.length,
    metadata: {
      model: request.model,
      provider: "lovable_ai_sync"
    }
  };
}
