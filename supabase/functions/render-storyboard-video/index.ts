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

    const { storyboardId } = await req.json();

    const tokenCost = 800;

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

    // Fetch storyboard
    const { data: storyboard, error: storyboardError } = await supabaseClient
      .from('storyboards')
      .select('*')
      .eq('id', storyboardId)
      .eq('user_id', user.id)
      .single();

    if (storyboardError || !storyboard) {
      throw new Error('Storyboard not found or unauthorized');
    }

    // Fetch scenes in order
    const { data: scenes, error: scenesError } = await supabaseClient
      .from('storyboard_scenes')
      .select('*')
      .eq('storyboard_id', storyboardId)
      .order('order_number', { ascending: true });

    if (scenesError || !scenes || scenes.length === 0) {
      throw new Error('No scenes found');
    }

    // Validate all scenes have required data
    for (const scene of scenes) {
      if (!scene.voice_over_text || !scene.image_prompt) {
        throw new Error('All scenes must have voiceover and image prompt');
      }
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

    // Build payload for rendering service (json2video format)
    const renderPayload = {
      template: storyboard.template_id || 'default',
      variables: {
        introImagePrompt: storyboard.intro_image_prompt,
        introVoiceoverText: storyboard.intro_voiceover_text,
        scenes: scenes.map(s => ({
          voiceOverText: s.voice_over_text,
          imagePrompt: s.image_prompt,
        })),
        voiceID: storyboard.voice_id,
        style: storyboard.style,
      },
    };

    // For now, simulate job creation (replace with actual API call)
    const mockJobId = `storyboard_${storyboardId}_${Date.now()}`;
    
    // Update storyboard status
    const { error: updateError } = await supabaseClient
      .from('storyboards')
      .update({
        status: 'rendering',
        render_job_id: mockJobId,
        updated_at: new Date().toISOString()
      })
      .eq('id', storyboardId);

    if (updateError) {
      console.error('Status update error:', updateError);
      // Refund tokens
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: tokenCost
      });
      throw new Error('Failed to update storyboard status');
    }

    // TODO: Integrate with actual rendering service (json2video or similar)
    // For now, return mock job ID
    return new Response(
      JSON.stringify({
        jobId: mockJobId,
        estimatedTime: 60,
        payload: renderPayload
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