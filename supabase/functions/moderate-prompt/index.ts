import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationResult {
  flagged: boolean;
  categories: string[];
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not configured');
      // Fail open - allow generation if moderation is not configured
      return new Response(
        JSON.stringify({ flagged: false, categories: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: prompt,
        model: 'omni-moderation-latest',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Moderation API error:', response.status, errorText);
      // Fail open on API errors
      return new Response(
        JSON.stringify({ flagged: false, categories: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const result = data.results?.[0];

    if (!result) {
      return new Response(
        JSON.stringify({ flagged: false, categories: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract flagged categories
    const flaggedCategories: string[] = [];
    const categoryLabels: Record<string, string> = {
      'sexual': 'sexual content',
      'sexual/minors': 'sexual content involving minors',
      'harassment': 'harassment',
      'harassment/threatening': 'threatening harassment',
      'hate': 'hate speech',
      'hate/threatening': 'threatening hate speech',
      'illicit': 'illicit content',
      'illicit/violent': 'illicit violent content',
      'self-harm': 'self-harm content',
      'self-harm/intent': 'self-harm intent',
      'self-harm/instructions': 'self-harm instructions',
      'violence': 'violence',
      'violence/graphic': 'graphic violence',
    };

    for (const [category, isFlagged] of Object.entries(result.categories || {})) {
      if (isFlagged) {
        flaggedCategories.push(categoryLabels[category] || category);
      }
    }

    const moderationResult: ModerationResult = {
      flagged: result.flagged || false,
      categories: flaggedCategories,
    };

    if (moderationResult.flagged) {
      moderationResult.message = `Your prompt was flagged for containing ${flaggedCategories.join(', ')}. Please revise your prompt.`;
      console.log('Prompt flagged:', { categories: flaggedCategories, promptLength: prompt.length });
    }

    return new Response(
      JSON.stringify(moderationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Moderation error:', error);
    // Fail open on unexpected errors
    return new Response(
      JSON.stringify({ flagged: false, categories: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
