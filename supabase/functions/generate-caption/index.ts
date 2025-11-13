import "https://deno.land/x/xhr@0.1.0/mod.ts";

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generation_id, video_job_id, prompt, content_type, model_name } = await req.json();

    if ((!generation_id && !video_job_id) || !prompt || !content_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: (generation_id OR video_job_id), prompt, content_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a social media expert. Generate a captivating caption and 15 popular hashtags that describe the ${content_type === 'video' ? 'video' : 'image'} content.

Content Type: ${content_type}
What the ${content_type === 'video' ? 'video' : 'image'} shows: ${prompt}

Create a caption (150-280 characters, 2-3 complete sentences) that:
- CRITICAL: Caption MUST end with proper punctuation (. ! or ?)
- NO incomplete thoughts or cut-off sentences
- Describes what's actually IN the ${content_type === 'video' ? 'video' : 'image'}
- Is engaging and works well on Instagram, Twitter, TikTok, or other social media
- Does NOT mention AI, models, or the generation process
- Focuses on the visual content and subject matter

Make the hashtags relevant to:
- The actual subject matter in the ${content_type === 'video' ? 'video' : 'image'}
- Popular related topics
- Niche-specific content categories
- Current trends related to the content

IMPORTANT: Each hashtag MUST include the # symbol (e.g., #Fashion, #Style).`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_completion_tokens: 250,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a captivating caption and exactly 15 popular hashtags for this content.' }
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
                    minItems: 15,
                    maxItems: 15,
                    description: "Exactly 15 hashtags WITH # symbol (e.g., #Fashion)"
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

    if (!caption || !Array.isArray(hashtags) || hashtags.length !== 15) {
      throw new Error('Invalid response format from AI');
    }

    // Validate caption is complete
    const trimmedCaption = caption.trim();
    if (!trimmedCaption.match(/[.!?]$/)) {
      console.error('Incomplete caption received:', caption);
      throw new Error('Caption is incomplete - does not end with proper punctuation');
    }
    if (trimmedCaption.length < 50) {
      console.error('Caption too short:', caption);
      throw new Error('Caption is too short - minimum 50 characters required');
    }

    // Ensure all hashtags have # symbol
    const formattedHashtags = hashtags.map(tag => 
      tag.startsWith('#') ? tag : `#${tag}`
    );

    // Update the generation or video_job record
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();
    const updateData = {
      ai_caption: caption,
      ai_hashtags: formattedHashtags,
      caption_generated_at: now
    };

    let updateError;
    if (video_job_id) {
      const result = await supabase
        .from('video_jobs')
        .update(updateData)
        .eq('id', video_job_id);
      updateError = result.error;
      console.log('Caption generated successfully for video job:', video_job_id);
    } else {
      const result = await supabase
        .from('generations')
        .update(updateData)
        .eq('id', generation_id);
      updateError = result.error;
      console.log('Caption generated successfully for generation:', generation_id);
    }

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to save caption to database');
    }

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
