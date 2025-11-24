import type { ProviderRequest, ProviderResponse } from "./index.ts";
import { EdgeLogger } from "../../_shared/edge-logger.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Lovable AI Provider - Synchronous image generation
 * Uses gpt-image-1 model (OpenAI)
 */
export async function callLovableAI(request: ProviderRequest): Promise<ProviderResponse> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const logger = new EdgeLogger('lovable-ai-provider', crypto.randomUUID(), supabaseClient);

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  logger.info('Lovable AI generation start', {
    metadata: {
      event: 'lovable_ai_generation_start',
      prompt_length: request.prompt.length,
      aspectRatio: request.parameters.aspectRatio
    }
  });

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
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
      logger.error('Lovable AI rate limit exceeded', undefined, { metadata: { event: 'lovable_ai_rate_limit' } });
      throw new Error('Rate limit exceeded - too many requests. Please try again later.');
    }

    if (response.status === 402) {
      logger.error('Lovable AI insufficient credits', undefined, { metadata: { event: 'lovable_ai_insufficient_credits' } });
      throw new Error('Insufficient AI credits. Please add credits in Settings → Workspace → Usage.');
    }

    logger.error('Lovable AI error', undefined, {
      metadata: {
        event: 'lovable_ai_error',
        status: response.status,
        error: errorText.substring(0, 200)
      }
    });
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

  logger.info('Lovable AI generation complete', {
    metadata: {
      event: 'lovable_ai_generation_complete',
      format,
      sizeKB: Math.round(binaryData.length / 1024)
    }
  });

  return {
    output_data: binaryData,
    file_extension: format,
    file_size: binaryData.length,
    metadata: {
      provider: 'lovable_ai_sync',
      model: 'gpt-image-1',
      aspectRatio: request.parameters.aspectRatio || '1:1'
    }
  };
}
