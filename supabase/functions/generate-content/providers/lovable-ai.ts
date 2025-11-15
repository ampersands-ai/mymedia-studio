import type { ProviderRequest, ProviderResponse } from "./index.ts";

const LOVABLE_AI_GATEWAY = "https://api.lovable.app/v1/openai-gateway";

export async function callLovableAI(request: ProviderRequest): Promise<ProviderResponse> {
  console.log('[Lovable AI] Starting image generation', { model: request.model });

  const payload = {
    model: request.model || "google/gemini-2.5-flash-image-preview",
    messages: [
      {
        role: "user",
        content: request.prompt
      }
    ],
    response_format: {
      type: "image_url"
    },
    ...request.parameters
  };

  console.log('[Lovable AI] Request payload prepared', { 
    model: payload.model,
    promptLength: request.prompt.length,
    parameters: Object.keys(request.parameters)
  });

  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
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

  if (!result.choices?.[0]?.message?.content) {
    throw new Error('No image URL in Lovable AI response');
  }

  const imageUrl = result.choices[0].message.content;
  console.log('[Lovable AI] Image URL received', { 
    urlLength: imageUrl.length 
  });

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  const uint8Data = new Uint8Array(arrayBuffer);

  console.log('[Lovable AI] Image downloaded', { 
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
