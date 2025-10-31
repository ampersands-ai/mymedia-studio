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

    // Check user credit balance
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
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch storyboard
    const { data: storyboard, error: storyboardError } = await supabaseClient
      .from('storyboards')
      .select('*, intro_image_preview_url')
      .eq('id', storyboardId)
      .eq('user_id', user.id)
      .single();

    if (storyboardError || !storyboard) {
      throw new Error('Storyboard not found or unauthorized');
    }

    // Fetch scenes in order (include image_preview_url)
    const { data: scenes, error: scenesError } = await supabaseClient
      .from('storyboard_scenes')
      .select('id, order_number, voice_over_text, image_prompt, image_preview_url')
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

    // Deduct credits
    const { error: deductError } = await supabaseClient.rpc('increment_tokens', {
      user_id_param: user.id,
      amount: -tokenCost
    });

    if (deductError) {
      console.error('Credit deduction error:', deductError);
      throw new Error('Failed to deduct credits');
    }

    // Build JSON2Video payload
    const json2videoApiKey = Deno.env.get('JSON2VIDEO_API_KEY');
    if (!json2videoApiKey) {
      throw new Error('JSON2VIDEO_API_KEY not configured');
    }

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/json2video-webhook`;
    
    const renderPayload = {
      template: 'hae1en4rQdJHFgFS3545',
      variables: {
        scenes: scenes.map(s => ({
          // If scene has a generated preview, pass the URL; otherwise use the prompt
          ...(s.image_preview_url 
            ? { imageUrl: s.image_preview_url }  // JSON2Video will use this image directly
            : { imagePrompt: s.image_prompt }     // JSON2Video will generate from prompt
          ),
          voiceOverText: s.voice_over_text,
        })),
        voiceModel: storyboard.voice_model || 'azure',
        imageModel: storyboard.image_model || 'freepik-classic',
        subtitlesModel: storyboard.subtitles_model || 'default',
        fontFamily: storyboard.font_family || 'Oswald Bold',
        voiceID: storyboard.voice_id,
        // If intro has a generated preview, pass the URL; otherwise use the prompt
        ...(storyboard.intro_image_preview_url
          ? { introImageUrl: storyboard.intro_image_preview_url }
          : { introImagePrompt: storyboard.intro_image_prompt }
        ),
        introText: storyboard.intro_voiceover_text,
      },
      project: storyboardId,
      exports: [
        {
          destinations: [
            {
              type: "webhook",
              endpoint: webhookUrl,
              "content-type": "json"
            }
          ]
        }
      ],
      // Apply customization settings
      ...mapAspectRatio(
        storyboard.aspect_ratio || 'full-hd',
        storyboard.custom_width,
        storyboard.custom_height
      ),
      quality: (['low', 'medium', 'high'].includes(storyboard.video_quality) ? storyboard.video_quality : 'high'),
      cache: storyboard.enable_cache ?? true,
      draft: storyboard.draft_mode ?? false,
      elements: [
        {
          type: 'subtitles',
          model: storyboard.subtitle_model || 'default',
          language: storyboard.subtitle_language || 'auto',
          settings: {
            'style': storyboard.subtitle_style || 'boxed-word',
            'font-family': storyboard.subtitle_font_family || 'Oswald Bold',
            'font-size': storyboard.subtitle_settings?.fontSize || 140,
            'all-caps': storyboard.subtitle_all_caps ?? false,
            'box-color': storyboard.subtitle_box_color || '#000000',
            'line-color': storyboard.subtitle_line_color || '#FFFFFF',
            'word-color': storyboard.subtitle_word_color || '#FFFF00',
            'position': storyboard.subtitle_settings?.position || 'mid-bottom-center',
            'outline-color': storyboard.subtitle_settings?.outlineColor || '#000000',
            'outline-width': storyboard.subtitle_settings?.outlineWidth || 8,
            'shadow-color': storyboard.subtitle_shadow_color || '#000000',
            'shadow-offset': storyboard.subtitle_shadow_offset || 0,
            'max-words-per-line': storyboard.subtitle_max_words_per_line || 4,
          },
        },
        {
          type: 'audio',
          src: 'https://assets.json2video.com/clients/JugBn84wBL/uploads/dramatic-epic-background-305293.mp3',
          ...(storyboard.music_settings || {
            volume: 0.05,
            'fade-in': 2,
            'fade-out': 2,
            duration: -2
          })
        }
      ],
      imageAnimationSettings: storyboard.image_animation_settings || { zoom: 2, position: 'center-center' }
    };

    // Helper function to map resolution presets
    function mapAspectRatio(ratio: string, customWidth?: number, customHeight?: number) {
      // For custom resolution, width and height are required
      if (ratio === 'custom') {
        if (!customWidth || !customHeight) {
          throw new Error('Custom resolution requires width and height');
        }
        return {
          resolution: 'custom',
          width: customWidth,
          height: customHeight
        };
      }
      
      // For preset resolutions, only resolution is needed (API sets dimensions)
      // But we include width/height for completeness
      const presetMap: Record<string, { resolution: string; width?: number; height?: number }> = {
        'sd': { resolution: 'sd' },
        'hd': { resolution: 'hd' },
        'full-hd': { resolution: 'full-hd' },
        'squared': { resolution: 'squared' },
        'instagram-story': { resolution: 'instagram-story' },
        'instagram-feed': { resolution: 'instagram-feed' },
        'twitter-landscape': { resolution: 'twitter-landscape' },
        'twitter-portrait': { resolution: 'twitter-portrait' },
      };
      
      return presetMap[ratio] || presetMap['full-hd']; // Default to Full HD
    }

    console.log('[render-storyboard-video] Calling JSON2Video API with payload:', JSON.stringify(renderPayload, null, 2));

    // Call JSON2Video API
    const json2videoResponse = await fetch('https://api.json2video.com/v2/movies', {
      method: 'POST',
      headers: {
        'x-api-key': json2videoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(renderPayload)
    });

    if (!json2videoResponse.ok) {
      const errorText = await json2videoResponse.text();
      console.error('[render-storyboard-video] JSON2Video API error:', json2videoResponse.status, errorText);
      
      // Refund credits on API error
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: tokenCost
      });
      
      if (json2videoResponse.status === 429) {
        throw new Error('JSON2Video rate limit exceeded. Please try again later.');
      } else if (json2videoResponse.status === 401 || json2videoResponse.status === 403) {
        throw new Error('JSON2Video API authentication failed. Please contact support.');
      }
      
      throw new Error(`JSON2Video API error: ${json2videoResponse.status}`);
    }

    const json2videoData = await json2videoResponse.json();
    const renderJobId = json2videoData.project || json2videoData.id;

    console.log('[render-storyboard-video] JSON2Video render started:', renderJobId);

    // Update storyboard status
    const { error: updateError } = await supabaseClient
      .from('storyboards')
      .update({
        status: 'rendering',
        render_job_id: renderJobId,
        updated_at: new Date().toISOString()
      })
      .eq('id', storyboardId);

    if (updateError) {
      console.error('[render-storyboard-video] Status update error:', updateError);
      // Refund credits
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: tokenCost
      });
      throw new Error('Failed to update storyboard status');
    }

    return new Response(
      JSON.stringify({
        jobId: renderJobId,
        estimatedTime: 180, // 3 minutes typical for JSON2Video
        webhookConfigured: true,
        message: 'Video rendering started. You will be notified when complete.'
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