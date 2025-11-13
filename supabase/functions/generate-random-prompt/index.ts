
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('generate-random-prompt', requestId);
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create content-type specific system prompts
    const systemPrompts: Record<string, string> = {
      image: "You are a creative AI prompt generator for image generation. Generate a single, highly creative and detailed prompt for image generation. The prompt should be vivid, imaginative, and suitable for AI image generation models. Include details about style, lighting, composition, and mood. Keep it to 1-2 sentences, max 150 words. Be diverse - generate prompts across many themes: fantasy, sci-fi, nature, abstract, cyberpunk, steampunk, surreal, realistic, artistic styles, etc.",
      video: "You are a creative AI prompt generator for video generation. Generate a single, highly creative and detailed prompt for video generation. The prompt should describe dynamic scenes with movement, action, and visual storytelling. Include camera angles, transitions, and atmosphere. Keep it to 1-2 sentences, max 150 words. Be diverse - cover action scenes, nature timelapses, abstract animations, cinematic sequences, etc.",
      audio: "You are a creative AI prompt generator for audio/music generation. Generate a single, highly creative and detailed prompt for audio or music generation. Describe the mood, instruments, tempo, genre, and atmosphere. Keep it to 1-2 sentences, max 150 words. Be diverse - cover various genres from orchestral to electronic, ambient to energetic.",
    };

    const systemPrompt = systemPrompts[contentType] || systemPrompts.image;

    logger.info('Generating random prompt', { metadata: { contentType } });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a unique, creative prompt now. Be completely random and unexpected.' }
        ],
        temperature: 1.2, // Higher temperature for more creativity
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service unavailable. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!generatedPrompt) {
      throw new Error('No prompt generated');
    }

    logger.info('Prompt generated successfully', { metadata: { prompt: generatedPrompt } });
    logger.logDuration('Prompt generation', startTime);

    return new Response(
      JSON.stringify({ prompt: generatedPrompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Prompt generation failed', error as Error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate prompt'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
