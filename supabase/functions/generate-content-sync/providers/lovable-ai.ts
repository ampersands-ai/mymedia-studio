import type { ProviderRequest, ProviderResponse } from "./index.ts";

/**
 * Lovable AI Provider - Synchronous image generation
 * Uses google/gemini-2.5-flash-image-preview model
 */
export async function callLovableAI(request: ProviderRequest): Promise<ProviderResponse> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  console.log(JSON.stringify({ 
    event: 'lovable_ai_generation_start',
    prompt_length: request.prompt.length,
    aspectRatio: request.parameters.aspectRatio 
  }));

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [{
        role: 'user',
        content: request.prompt
      }],
      modalities: ['image', 'text']
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    if (response.status === 429) {
      console.error(JSON.stringify({ event: 'lovable_ai_rate_limit' }));
      throw new Error('Rate limit exceeded - too many requests. Please try again later.');
    }
    
    if (response.status === 402) {
      console.error(JSON.stringify({ event: 'lovable_ai_insufficient_credits' }));
      throw new Error('Insufficient AI credits. Please add credits in Settings → Workspace → Usage.');
    }
    
    console.error(JSON.stringify({ 
      event: 'lovable_ai_error', 
      status: response.status, 
      error: errorText.substring(0, 200)
    }));
    throw new Error(`Lovable AI request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageUrl || !imageUrl.startsWith('data:image/')) {
    throw new Error('No valid image returned from Lovable AI');
  }

  // Extract base64 data
  const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid image data format');
  }

  const [, format, base64Data] = base64Match;
  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  console.log(JSON.stringify({ 
    event: 'lovable_ai_generation_complete',
    format,
    sizeKB: Math.round(binaryData.length / 1024)
  }));

  return {
    output_data: binaryData,
    file_extension: format,
    file_size: binaryData.length,
    metadata: {
      provider: 'lovable_ai_sync',
      model: 'google/gemini-2.5-flash-image-preview',
      aspectRatio: request.parameters.aspectRatio || '1:1'
    }
  };
}
