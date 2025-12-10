import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationResult {
  flagged: boolean;
  categories: {
    sexual: boolean;
    'sexual/minors': boolean;
    harassment: boolean;
    'harassment/threatening': boolean;
    hate: boolean;
    'hate/threatening': boolean;
    illicit: boolean;
    'illicit/violent': boolean;
    'self-harm': boolean;
    'self-harm/intent': boolean;
    'self-harm/instructions': boolean;
    violence: boolean;
    'violence/graphic': boolean;
  };
  category_scores: Record<string, number>;
}

interface ModeratePromptRequest {
  prompt: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Moderation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt } = await req.json() as ModeratePromptRequest;

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI's free Moderation API
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Moderation API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Moderation check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const result: ModerationResult = data.results[0];

    // Get list of flagged categories for user-friendly message
    const flaggedCategories: string[] = [];
    if (result.flagged) {
      for (const [category, isFlagged] of Object.entries(result.categories)) {
        if (isFlagged) {
          flaggedCategories.push(category.replace('/', ' / ').replace(/-/g, ' '));
        }
      }
    }

    console.log('Moderation result:', {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      flagged: result.flagged,
      flaggedCategories,
    });

    return new Response(
      JSON.stringify({
        flagged: result.flagged,
        flaggedCategories,
        categories: result.categories,
        categoryScores: result.category_scores,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in moderate-prompt:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
