import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { topic, duration, style, tone, voiceID, voiceName } = await req.json();

    // Validate inputs
    if (!topic || topic.length < 5 || topic.length > 500) {
      throw new Error('Topic must be between 5 and 500 characters');
    }

    if (!duration || duration < 15 || duration > 120 || duration % 5 !== 0) {
      throw new Error('Duration must be between 15 and 120 seconds in 5-second increments');
    }

    // Calculate scene count (approximately 5 seconds per scene)
    const sceneCount = Math.floor(duration / 5);
    const tokenCost = 250;

    // Check user token balance
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      throw new Error('Could not fetch user subscription');
    }

    if (subscription.tokens_remaining < tokenCost) {
      return new Response(
        JSON.stringify({ error: 'Insufficient tokens' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare AI prompt
    const systemPrompt = `You are a viral faceless video creator specializing in engaging, educational content.

OUTPUT FORMAT (strict JSON only):
{
  "comment": "Creative direction note",
  "variables": {
    "introImagePrompt": "${style} image prompt",
    "introVoiceoverText": "Title\\nHook line",
    "scenes": [
      {
        "voiceOverText": "One sentence max",
        "imagePrompt": "${style} detailed image prompt"
      }
    ]
  }
}

RULES:
- Generate exactly ${sceneCount} scenes
- Each scene = 1 sentence voiceover (5-8 words)
- Image prompts MUST start with "${style}" style tag
- Tone: ${tone}
- Build narrative arc: hook → build tension → reveal insight → memorable conclusion
- Use 6th-8th grade language
- Make it emotionally engaging
- Keep voiceover text concise and punchy`;

    const userPrompt = `Topic: ${topic}
Duration: ${duration}s
Create ${sceneCount} micro-scenes that teach/reveal something fascinating about this topic.`;

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[generate-storyboard] Calling Lovable AI Gateway...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[generate-storyboard] AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please contact support.');
      }
      
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    const parsedContent = JSON.parse(content);
    
    if (!parsedContent.variables || !parsedContent.variables.scenes) {
      throw new Error('Invalid AI response format');
    }

    const { introImagePrompt, introVoiceoverText, scenes } = parsedContent.variables;

    // Deduct tokens
    const { error: deductError } = await supabaseClient.rpc('increment_tokens', {
      user_id_param: user.id,
      amount: -tokenCost
    });

    if (deductError) {
      console.error('Token deduction error:', deductError);
      throw new Error('Failed to deduct tokens');
    }

    // Create storyboard record
    const { data: storyboard, error: storyboardError } = await supabaseClient
      .from('storyboards')
      .insert({
        user_id: user.id,
        topic,
        duration,
        style,
        tone,
        voice_id: voiceID,
        voice_name: voiceName,
        intro_image_prompt: introImagePrompt,
        intro_voiceover_text: introVoiceoverText,
        tokens_cost: tokenCost,
        status: 'draft'
      })
      .select()
      .single();

    if (storyboardError) {
      console.error('Storyboard creation error:', storyboardError);
      // Refund tokens
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: tokenCost
      });
      throw new Error('Failed to create storyboard');
    }

    // Insert scenes
    const scenesData = scenes.map((scene: any, index: number) => ({
      storyboard_id: storyboard.id,
      order_number: index + 1,
      voice_over_text: scene.voiceOverText,
      image_prompt: scene.imagePrompt,
      is_edited: false
    }));

    const { data: createdScenes, error: scenesError } = await supabaseClient
      .from('storyboard_scenes')
      .insert(scenesData)
      .select();

    if (scenesError) {
      console.error('Scenes creation error:', scenesError);
      throw new Error('Failed to create scenes');
    }

    return new Response(
      JSON.stringify({
        storyboard,
        scenes: createdScenes,
        tokensUsed: tokenCost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});