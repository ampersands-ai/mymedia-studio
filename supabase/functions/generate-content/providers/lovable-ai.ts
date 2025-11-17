import type { ProviderRequest, ProviderResponse } from "./index.ts";

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function callLovableAI(request: ProviderRequest): Promise<ProviderResponse> {
  console.log('[Lovable AI] Starting image generation', { model: request.model });

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

  // Extract prompt from parameters (should be in prompt, positivePrompt, or positive_prompt)
  const promptField = request.parameters.prompt || request.parameters.positivePrompt || request.parameters.positive_prompt || '';
  
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
  console.log('[Lovable AI] Request payload prepared', { 
    model: payload.model,
    promptLength: promptField.length,
    parameters: Object.keys(request.parameters)
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
    console.error('[Lovable AI] API error', { 
      status: response.status, 
      error: errorText 
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
  console.log('[Lovable AI] Response received', { 
    hasChoices: !!result.choices,
    choicesCount: result.choices?.length 
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

  console.log('[Lovable AI] Image decoded', { 
    size_bytes: uint8Data.length,
    size_kb: Math.round(uint8Data.length / 1024)
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
