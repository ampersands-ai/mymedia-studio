import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('generate-video-topic', requestId);

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    logger.info('Generating video topic with AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Generate a creative, engaging topic for a 60-second faceless video suitable for social media.

Requirements:
- Make it trendy and attention-grabbing
- Should work well for short-form content (TikTok, YouTube Shorts, Reels)
- Topics can be about: tech, productivity, AI, history facts, psychology, life hacks, business tips, science, or current trends
- Keep it specific and interesting
- Return ONLY the topic itself, no explanation or quotes

Example topics:
- "Why your brain needs boredom to be creative"
- "The 5-second rule that billionaires use every morning"
- "How AI is secretly changing your daily habits"
- "Ancient Roman productivity hacks that still work today"

Generate ONE creative topic now:`
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Lovable AI error', new Error(String(errorText)), { metadata: { status: response.status } });
      
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
      
      throw new Error(`AI gateway error: ${errorText}`);
    }

    const data = await response.json();
    const topic = data.choices[0]?.message?.content?.trim();

    if (!topic) {
      throw new Error('No topic generated');
    }

    logger.info('Generated topic', { metadata: { topic } });

    return new Response(
      JSON.stringify({ topic }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logger.error('Error generating video topic:', error as any);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate topic' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
