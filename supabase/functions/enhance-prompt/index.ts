import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, category } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert AI prompt engineer. Your task is to enhance and improve prompts for AI content generation.

When enhancing prompts:
- Add specific visual details, lighting, and composition
- Include style references and artistic techniques
- Add quality markers (ultra detailed, professional, high resolution)
- Maintain the core intent of the original prompt
- Keep it under 500 words
- Make it more descriptive and visually rich
${category ? `- Consider this is for: ${category}` : ''}

Original prompt: "${prompt}"

Provide an enhanced version that will produce better AI-generated content.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_completion_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Enhance this prompt to produce the best possible AI generation.' }
        ],
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI enhancement failed: ${response.status}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content;

    if (!enhancedPrompt) {
      throw new Error('No enhanced prompt returned from AI');
    }

    console.log('Prompt enhanced successfully');

    return new Response(
      JSON.stringify({
        enhanced_prompt: enhancedPrompt.trim()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhance-prompt function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to enhance prompt';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
