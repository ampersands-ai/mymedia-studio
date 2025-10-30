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

    const { storyboardId, sceneId, previousSceneText, nextSceneText } = await req.json();

    const tokenCost = 50;

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

    // Fetch storyboard details
    const { data: storyboard, error: storyboardError } = await supabaseClient
      .from('storyboards')
      .select('*')
      .eq('id', storyboardId)
      .eq('user_id', user.id)
      .single();

    if (storyboardError || !storyboard) {
      throw new Error('Storyboard not found or unauthorized');
    }

    // Fetch current scene
    const { data: currentScene, error: sceneError } = await supabaseClient
      .from('storyboard_scenes')
      .select('*')
      .eq('id', sceneId)
      .single();

    if (sceneError || !currentScene) {
      throw new Error('Scene not found');
    }

    // Prepare AI prompt with context
    const systemPrompt = `You are a viral faceless video creator. Regenerate a single scene that fits seamlessly into an existing narrative.

OUTPUT FORMAT (strict JSON only):
{
  "voiceOverText": "One sentence max (8-12 words)",
  "imagePrompt": "${storyboard.style} detailed image prompt"
}

RULES:
- Scene must flow naturally between previous and next scenes
- Keep the ${storyboard.tone} tone
- Image prompt MUST start with "${storyboard.style}" style tag
- Voiceover: concise, engaging, 6th-8th grade language`;

    const userPrompt = `Topic: ${storyboard.topic}
Previous scene: ${previousSceneText || 'This is the first scene'}
Next scene: ${nextSceneText || 'This is the last scene'}

Create a scene that bridges these naturally.`;

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('[regenerate-scene] Calling Lovable AI Gateway...');
    
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
      console.error('[regenerate-scene] AI API error:', aiResponse.status, errorText);
      
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
    
    if (!parsedContent.voiceOverText || !parsedContent.imagePrompt) {
      throw new Error('Invalid AI response format');
    }

    // Deduct tokens
    const { error: deductError } = await supabaseClient.rpc('increment_tokens', {
      user_id_param: user.id,
      amount: -tokenCost
    });

    if (deductError) {
      console.error('Token deduction error:', deductError);
      throw new Error('Failed to deduct tokens');
    }

    // Update scene
    const { data: updatedScene, error: updateError } = await supabaseClient
      .from('storyboard_scenes')
      .update({
        voice_over_text: parsedContent.voiceOverText,
        image_prompt: parsedContent.imagePrompt,
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', sceneId)
      .select()
      .single();

    if (updateError) {
      console.error('Scene update error:', updateError);
      // Refund tokens
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: tokenCost
      });
      throw new Error('Failed to update scene');
    }

    return new Response(
      JSON.stringify({
        scene: updatedScene,
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