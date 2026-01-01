/**
 * Prompt Enhancement Service
 * Handles AI-powered prompt enhancement for better generation quality
 */

export interface EnhancementResult {
  enhanced: string;
  provider: string;
}

/**
 * Enhance a prompt using Lovable AI
 */
export async function enhancePrompt(
  prompt: string,
  instruction: string | null,
  provider: string,
  contentType: string,
  modelProvider: string,
  customMode: boolean | undefined
): Promise<EnhancementResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  let systemPrompt = instruction;

  if (!systemPrompt) {
    // For provider audio non-custom mode, enforce strict 500 character limit
    if (modelProvider === 'kie_ai' && contentType === 'audio' && customMode === false) {
      systemPrompt = `You are a prompt enhancement AI for audio generation. Transform the user's prompt into an optimized prompt for better audio output.

CRITICAL CONSTRAINT: Your response MUST be MAXIMUM 480 characters (leaving room for any trailing spaces).

Keep the core intent, add key musical/audio details (genre, mood, instruments, tempo), but stay extremely concise. Use abbreviations where appropriate. Return ONLY the enhanced prompt under 480 characters, no explanations or quotation marks.`;
    } else {
      systemPrompt = `You are a prompt enhancement AI. Transform the user's prompt into a detailed, optimized prompt for ${contentType} generation. Keep the core intent but add professional details, style descriptions, and technical parameters that will improve the output quality. Return ONLY the enhanced prompt, no explanations.`;
    }
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Enhancement failed: ${response.status}`);
  }

  const data = await response.json();
  let enhanced = data.choices[0].message.content.trim();

  // Safety net: Force truncate if enhancement still exceeds limit for provider non-custom mode
  if (modelProvider === 'kie_ai' && contentType === 'audio' && customMode === false) {
    if (enhanced.length > 500) {
      enhanced = enhanced.slice(0, 497) + '...';
    }
  }

  return { enhanced, provider: 'lovable_ai' };
}
