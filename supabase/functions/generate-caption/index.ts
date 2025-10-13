import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generation_id, prompt, content_type, model_name } = await req.json();

    if (!generation_id || !prompt || !content_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: generation_id, prompt, content_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a social media expert specializing in AI-generated content. Generate a captivating caption and 20 popular hashtags for this content.

Content Type: ${content_type}
Model Used: ${model_name || 'AI Model'}
Original Prompt: ${prompt}

Make the caption engaging (2-3 sentences) that would work well on Instagram, Twitter, or other social media.
Make the hashtags a mix of:
- Popular general tags (high reach)
- Niche-specific tags (targeted audience)
- Trending AI/tech tags

IMPORTANT: Each hashtag MUST include the # symbol (e.g., #AIArt, #GenerativeAI).`;

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
          { role: 'user', content: 'Generate a captivating caption and exactly 20 popular hashtags for this AI-generated content.' }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_caption_hashtags",
              description: "Generate a social media caption and hashtags",
              parameters: {
                type: "object",
                properties: {
                  caption: { 
                    type: "string",
                    description: "2-3 sentence engaging caption"
                  },
                  hashtags: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 20,
                    maxItems: 20,
                    description: "Exactly 20 hashtags WITH # symbol (e.g., #AIArt)"
                  }
                },
                required: ["caption", "hashtags"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_caption_hashtags" } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const result = JSON.parse(toolCall.function.arguments);
    const { caption, hashtags } = result;

    if (!caption || !Array.isArray(hashtags) || hashtags.length !== 20) {
      throw new Error('Invalid response format from AI');
    }

    // Ensure all hashtags have # symbol
    const formattedHashtags = hashtags.map(tag => 
      tag.startsWith('#') ? tag : `#${tag}`
    );

    // Update the generation record
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        ai_caption: caption,
        ai_hashtags: formattedHashtags,
        caption_generated_at: now
      })
      .eq('id', generation_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to save caption to database');
    }

    console.log('Caption generated successfully for generation:', generation_id);

    return new Response(
      JSON.stringify({
        caption,
        hashtags: formattedHashtags,
        generated_at: now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-caption function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate caption';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
