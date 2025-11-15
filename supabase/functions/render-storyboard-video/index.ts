import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a unique random ID for JSON2Video project identifier
const generateUniqueRenderJobId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};

// Helper to detect if a URL is a video file
const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.mp4') || 
         lowerUrl.includes('.webm') || 
         lowerUrl.includes('.mov') ||
         lowerUrl.includes('video');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const logger = new EdgeLogger('render-storyboard-video', requestId, supabaseClient, true);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) {
      const errorMsg = authError && typeof authError === 'object' && 'message' in authError ? authError.message : 'Auth error';
      logger.error('Authentication failed', authError instanceof Error ? authError : new Error(String(errorMsg)));
      throw new Error('Unauthorized');
    }
    const user = userData.user;

    const { storyboardId, confirmRerender } = await req.json();

    // Generate unique render job ID for this request
    const uniqueRenderJobId = generateUniqueRenderJobId();
    logger.info('Generated unique render job ID', {
      userId: user.id,
      metadata: { storyboardId, renderJobId: uniqueRenderJobId }
    });

    // Fetch storyboard first to calculate cost and get initial estimate
    const { data: storyboard, error: storyboardError } = await supabaseClient
      .from('storyboards')
      .select('*, intro_image_preview_url, intro_voiceover_text, intro_video_url, estimated_render_cost')
      .eq('id', storyboardId)
      .eq('user_id', user.id)
      .single();

    if (storyboardError || !storyboard) {
      throw new Error('Storyboard not found or unauthorized');
    }

    // Check if this is a re-render request that needs confirmation
    if (storyboard.status === 'complete' && storyboard.video_url && !confirmRerender) {
      logger.info('Storyboard already rendered, requiring confirmation', {
        userId: user.id,
        metadata: { storyboardId }
      });
      
      // Fetch scenes to calculate cost
      const { data: scenes } = await supabaseClient
        .from('storyboard_scenes')
        .select('voice_over_text')
        .eq('storyboard_id', storyboardId)
        .order('order_number', { ascending: true });
      
      // Calculate the actual cost that will be charged
      const initialEstimate = storyboard.estimated_render_cost || (storyboard.duration * 0.25);
      const countChars = (text: string) => text?.trim().length || 0;
      
      const introChars = countChars(storyboard.intro_voiceover_text || '');
      const sceneChars = (scenes || []).reduce((sum, scene) => sum + countChars(scene.voice_over_text), 0);
      const currentTotalChars = introChars + sceneChars;
      const originalChars = storyboard.original_character_count || currentTotalChars;
      const charDifference = currentTotalChars - originalChars;
      
      let actualCost = initialEstimate;
      if (charDifference >= 100) {
        const additionalChunks = Math.floor(charDifference / 100);
        actualCost += additionalChunks * 0.25;
      } else if (charDifference <= -100) {
        const reducedChunks = Math.floor(Math.abs(charDifference) / 100);
        actualCost -= reducedChunks * 0.25;
        actualCost = Math.max(0, actualCost);
      }
      
      return new Response(
        JSON.stringify({ 
          requiresConfirmation: true,
          existingVideoUrl: storyboard.video_url,
          renderCost: parseFloat(actualCost.toFixed(2)),
          message: 'This storyboard has already been rendered. Re-rendering will charge you again.'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // If this is a confirmed re-render, reset the storyboard status
    if (confirmRerender && storyboard.status === 'complete') {
      logger.info('Resetting storyboard status for re-render', {
        userId: user.id,
        metadata: { storyboardId }
      });
      
      const { error: resetError } = await supabaseClient
        .from('storyboards')
        .update({ 
          status: 'rendering',
          render_job_id: null,
          video_url: null,
          video_storage_path: null,
        })
        .eq('id', storyboardId);
      
      if (resetError) {
        logger.error('Failed to reset storyboard', resetError instanceof Error ? resetError : undefined, {
          userId: user.id,
          metadata: { storyboardId }
        });
      }
    }

    // Fetch scenes to calculate total duration
    const { data: scenes, error: scenesError } = await supabaseClient
      .from('storyboard_scenes')
      .select('id, order_number, voice_over_text, image_prompt, image_preview_url, video_url')
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

    // Determine which template to use with robust video detection
    const hasIntroVideo = !!storyboard.intro_video_url || isVideoUrl(storyboard.intro_image_preview_url);
    const hasIntroPreview = !!storyboard.intro_image_preview_url && !isVideoUrl(storyboard.intro_image_preview_url);

    // Check each scene for video or image
    const scenesWithVideo = scenes.filter(s => !!s.video_url || isVideoUrl(s.image_preview_url));
    const scenesWithPreview = scenes.filter(s => !!s.image_preview_url && !isVideoUrl(s.image_preview_url));
    const allScenesHaveVideo = scenesWithVideo.length === scenes.length && scenesWithVideo.length > 0;
    const allScenesHavePreview = scenesWithPreview.length === scenes.length;
    const noScenesHavePreview = scenesWithPreview.length === 0 && scenesWithVideo.length === 0;

    let templateId: string;
    let templateType: 'all-pregenerated' | 'mixed' | 'all-ai-generated' | 'all-video';

    if (allScenesHaveVideo && (hasIntroVideo || !storyboard.intro_voiceover_text)) {
      // Priority 1: All content is video (intro + all scenes)
      templateId = '12dlFdikNAml1nfjKDaS';
      templateType = 'all-video';
      logger.debug('Using all-video template (animated content)', { userId: user.id });
    } else if (hasIntroPreview && allScenesHavePreview) {
      // Priority 2: All images are pre-generated (no videos)
      templateId = 'mG1o3jStlfepwwOj8a2H';
      templateType = 'all-pregenerated';
      logger.debug('Using all-pregenerated template', { userId: user.id });
    } else if (noScenesHavePreview && !hasIntroPreview && !hasIntroVideo) {
      // Priority 3: All images will be AI-generated by JSON2Video
      templateId = 'hae1en4rQdJHFgFS3545';
      templateType = 'all-ai-generated';
      logger.debug('Using all-ai-generated template', { userId: user.id });
    } else {
      // Priority 4: Mixed (some previews, some prompts, some videos)
      templateId = 'DcARTfg9eDbETcccFM7m';
      templateType = 'mixed';
      logger.debug('Using mixed template', { userId: user.id });
    }

    logger.info('Template selected', {
      userId: user.id,
      metadata: {
        templateId,
        templateType,
        intro: hasIntroVideo ? 'video' : hasIntroPreview ? 'image' : 'prompt',
        videos: scenesWithVideo.length,
        images: scenesWithPreview.length,
        prompts: scenes.length - scenesWithVideo.length - scenesWithPreview.length
      }
    });

    // Calculate estimated duration based on voice-over text (for logging purposes)
    // Note: Actual pricing is now based on character count changes
    const countWords = (text: string) => text.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    const introWords = storyboard.intro_voiceover_text ? countWords(storyboard.intro_voiceover_text) : 0;
    const sceneWords = scenes.reduce((sum, scene) => sum + countWords(scene.voice_over_text), 0);
    const totalWords = introWords + sceneWords;
    
    // Estimate duration in seconds (2.5 words per second)
    const estimatedDuration = Math.ceil(totalWords / 2.5);
    
    logger.info('Duration estimated', {
      userId: user.id,
      metadata: { estimatedDuration, totalWords }
    });

    // Get initial estimate and check user credit balance
    const initialEstimate = storyboard.estimated_render_cost || (storyboard.duration * 0.25);
    
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      throw new Error('Could not fetch user subscription');
    }

    // Never charge more than initial estimate - lock in the original price
    // Calculate pricing based on character changes
    const countChars = (text: string) => text?.trim().length || 0;
    
    // Calculate current total character count
    const introChars = countChars(storyboard.intro_voiceover_text || '');
    const sceneChars = scenes.reduce((sum, scene) => sum + countChars(scene.voice_over_text), 0);
    const currentTotalChars = introChars + sceneChars;
    
    // Get original character count
    const originalChars = storyboard.original_character_count || currentTotalChars;
    
    // Calculate character difference
    const charDifference = currentTotalChars - originalChars;
    
    logger.info('Character count analyzed', {
      userId: user.id,
      metadata: { 
        original: originalChars, 
        current: currentTotalChars, 
        difference: charDifference 
      }
    });
    
    // Calculate actual cost based on character changes
    let actualCost = initialEstimate;
    
    if (charDifference >= 100) {
      // Script increased: add 0.25 credits per 100 chars
      const additionalChunks = Math.floor(charDifference / 100);
      actualCost += additionalChunks * 0.25;
      logger.info('Script increased, adding credits', {
        userId: user.id,
        metadata: { 
          charDifference, 
          chunks: additionalChunks, 
          additionalCredits: (additionalChunks * 0.25).toFixed(2) 
        }
      });
    } else if (charDifference <= -100) {
      // Script decreased: reduce cost proportionally
      const reducedChunks = Math.floor(Math.abs(charDifference) / 100);
      actualCost -= reducedChunks * 0.25;
      actualCost = Math.max(0, actualCost);
      logger.info('Script decreased, reducing credits', {
        userId: user.id,
        metadata: { 
          charDifference: Math.abs(charDifference), 
          chunks: reducedChunks, 
          reducedCredits: (reducedChunks * 0.25).toFixed(2) 
        }
      });
    }
    
    logger.info('Cost calculated', {
      userId: user.id,
      metadata: { initialEstimate, actualCost: actualCost.toFixed(2) }
    });
    
    // Check if user has enough credits
    if (subscription.tokens_remaining < actualCost) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient credits. Need ${actualCost.toFixed(2)} credits to render video.` 
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { error: chargeError } = await supabaseClient.rpc('increment_tokens', {
      user_id_param: user.id,
      amount: -actualCost
    });
    
    if (chargeError) {
      logger.error('Failed to charge credits', chargeError instanceof Error ? chargeError : undefined, {
        userId: user.id
      });
      throw new Error('Failed to charge credits');
    }
    
    logger.info('Credits charged', {
      userId: user.id,
      metadata: { charged: actualCost.toFixed(2) }
    });
    
    // Update the actual cost in the storyboard
    const { error: updateCostError } = await supabaseClient
      .from('storyboards')
      .update({ estimated_render_cost: actualCost })
      .eq('id', storyboardId);


    if (updateCostError) {
      logger.warn('Failed to update actual cost', {
        userId: user.id,
        metadata: { error: updateCostError.message }
      });
    }

    // Build JSON2Video payload
    const json2videoApiKey = Deno.env.get('JSON2VIDEO_API_KEY');
    if (!json2videoApiKey) {
      throw new Error('JSON2VIDEO_API_KEY not configured');
    }

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/json2video-webhook`;
    
    // Build variables matching exact JSON2Video template structure
    const variables: Record<string, any> = {
      // Voice settings
      voiceModel: storyboard.voice_model || 'azure',
      voiceID: storyboard.voice_id,
      
      // Audio/Music
      audioURL: storyboard.background_music_url || '',
      musicVolume: storyboard.music_settings?.volume ?? 0.05,
      musicFadeIn: storyboard.music_settings?.fadeIn ?? 2,
      musicFadeOut: storyboard.music_settings?.fadeOut ?? 2,
      
      // Image generation model
      imageModel: storyboard.image_model || 'freepik-classic',
      
      // Intro text
      introText: storyboard.intro_voiceover_text || '',
      
      // Subtitle settings (unprefixed as per JSON2Video template)
      subtitlesModel: storyboard.subtitles_model || 'default',
      subtitleStyle: storyboard.subtitle_settings?.style || 'boxed-word',
      fontFamily: storyboard.subtitle_settings?.fontFamily || 'Oswald Bold',
      fontSize: storyboard.subtitle_settings?.fontSize || 140,
      allCaps: storyboard.subtitle_settings?.allCaps ?? false,
      boxColor: storyboard.subtitle_settings?.boxColor || '#000000',
      lineColor: storyboard.subtitle_settings?.lineColor || '#FFFFFF',
      wordColor: storyboard.subtitle_settings?.wordColor || '#FFFF00',
      outlineColor: storyboard.subtitle_settings?.outlineColor || '#000000',
      outlineWidth: storyboard.subtitle_settings?.outlineWidth ?? 8,
      shadowColor: storyboard.subtitle_settings?.shadowColor || '#000000',
      shadowOffset: storyboard.subtitle_settings?.shadowOffset ?? 0,
      position: storyboard.subtitle_settings?.position || 'mid-bottom-center',
      maxWordsPerLine: storyboard.subtitle_settings?.maxWordsPerLine || 4,
      x: storyboard.subtitle_settings?.x || 0,
      y: storyboard.subtitle_settings?.y || 0,
      keywords: storyboard.subtitle_settings?.keywords || [],
      fontUrl: storyboard.subtitle_settings?.fontUrl || '',
    };

    // Add intro content with correct variable names
    if (storyboard.intro_video_url) {
      variables.introVideoUrl = storyboard.intro_video_url;
    } else if (isVideoUrl(storyboard.intro_image_preview_url)) {
      // Video stored in wrong column - use introVideoUrl
      variables.introVideoUrl = storyboard.intro_image_preview_url;
    } else if (storyboard.intro_image_preview_url) {
      variables.introImageUrl = storyboard.intro_image_preview_url;
    } else if (storyboard.intro_image_prompt) {
      variables.introImagePrompt = storyboard.intro_image_prompt;
    }

    // Build scenes array with correct video/image variable names
    variables.scenes = scenes.map(s => {
      const sceneData: Record<string, any> = {
        voiceOverText: s.voice_over_text,
      };
      
      // Priority: video_url > video in image_preview_url > image > prompt
      if (s.video_url) {
        sceneData.videoUrl = s.video_url;
      } else if (isVideoUrl(s.image_preview_url)) {
        // Video stored in wrong column - use videoUrl
        sceneData.videoUrl = s.image_preview_url;
      } else if (s.image_preview_url) {
        sceneData.imageUrl = s.image_preview_url;
      } else {
        sceneData.imagePrompt = s.image_prompt;
      }
      
      return sceneData;
    });

    logger.debug('Built variables', {
      userId: user.id,
      metadata: { variable_keys: Object.keys(variables) }
    });

    const renderPayload = {
      template: templateId,
      variables,
      project: uniqueRenderJobId,
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

    logger.info('Calling JSON2Video API', { metadata: { renderPayload: JSON.stringify(renderPayload) } });

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
      logger.error('JSON2Video API error', new Error(`Status: ${json2videoResponse.status}, ${errorText}`));
      
      // Refund the charged credits since render failed
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: actualCost
      });
      
      if (json2videoResponse.status === 429) {
        throw new Error('JSON2Video rate limit exceeded. Please try again later.');
      } else if (json2videoResponse.status === 401 || json2videoResponse.status === 403) {
        throw new Error('JSON2Video API authentication failed. Please contact support.');
      }
      
      throw new Error(`JSON2Video API error: ${json2videoResponse.status}`);
    }

    const json2videoData = await json2videoResponse.json();
    logger.info('JSON2Video response received', { metadata: { project: json2videoData.project } });

    // ✅ CRITICAL: Use JSON2Video's returned project ID, not our generated one!
    const json2videoProjectId = json2videoData.project;

    if (!json2videoProjectId) {
      logger.error('JSON2Video did not return a project ID');
      
      // Refund the charged credits since we can't track the render
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: actualCost
      });
      
      throw new Error('JSON2Video API error: No project ID in response');
    }

    logger.info('JSON2Video project ID assigned', { 
      metadata: { 
        json2videoProjectId,
        generatedId: uniqueRenderJobId 
      }
    });

    // Update storyboard status with JSON2Video's project ID
    const { error: updateError } = await supabaseClient
      .from('storyboards')
      .update({
        status: 'rendering',
        render_job_id: json2videoProjectId, // ✅ Use THEIR ID, not ours!
        updated_at: new Date().toISOString()
      })
      .eq('id', storyboardId);

    if (updateError) {
      const errorMsg = updateError && typeof updateError === 'object' && 'message' in updateError ? updateError.message : 'Database error';
      logger.error('Status update error', updateError instanceof Error ? updateError : new Error(String(errorMsg)));
      // Refund initial estimate (actual cost may have been higher, but we limit refund to initial)
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: initialEstimate
      });
      throw new Error('Failed to update storyboard status');
    }

    return new Response(
      JSON.stringify({
        jobId: json2videoProjectId, // ✅ Return THEIR ID for polling
        estimatedTime: 180, // 3 minutes typical for JSON2Video
        webhookConfigured: true,
        message: 'Video rendering started. You will be notified when complete.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[render-storyboard-video] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});