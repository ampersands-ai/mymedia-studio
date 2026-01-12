import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";

/**
 * Inline Storyboard Video Renderer
 * 
 * This edge function renders storyboard videos using an INLINE movie structure
 * instead of JSON2Video templates. This avoids template-related issues like
 * invalid properties (e.g., font-color).
 * 
 * Test endpoint - does not modify original render-storyboard-video function.
 */

// Generate a unique random ID for JSON2Video elements
const generateElementId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return 'q' + Array.from({ length: 7 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};

// Generate a unique random ID for JSON2Video project identifier
const generateUniqueRenderJobId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};

// Helper to detect if a URL is a video file based on explicit extensions
const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.m4v'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
};

// Helper function to map resolution presets
function mapAspectRatio(ratio: string, customWidth?: number, customHeight?: number) {
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
  
  const presetMap: Record<string, { resolution: string; width?: number; height?: number }> = {
    'sd': { resolution: 'sd', width: 640, height: 480 },
    'hd': { resolution: 'hd', width: 1280, height: 720 },
    'full-hd': { resolution: 'full-hd', width: 1920, height: 1080 },
    'squared': { resolution: 'squared', width: 1080, height: 1080 },
    'instagram-story': { resolution: 'instagram-story', width: 1080, height: 1920 },
    'instagram-feed': { resolution: 'instagram-feed', width: 1080, height: 1920 },
    'twitter-landscape': { resolution: 'twitter-landscape', width: 1280, height: 720 },
    'twitter-portrait': { resolution: 'twitter-portrait', width: 720, height: 1280 },
  };
  
  return presetMap[ratio] || presetMap['full-hd'];
}

// Get height for vertical content based on aspect ratio
function getVerticalHeight(ratio: string): number {
  const verticalRatios = ['instagram-story', 'instagram-feed', 'twitter-portrait'];
  if (verticalRatios.includes(ratio)) {
    return 1920;
  }
  return 1080;
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const logger = new EdgeLogger('render-storyboard-video-inline', requestId, supabaseClient, true);

  try {
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

    const { storyboardId, confirmRerender, notifyOnCompletion = true } = await req.json();

    const uniqueRenderJobId = generateUniqueRenderJobId();
    logger.info('Starting inline render', {
      userId: user.id,
      metadata: { storyboardId, renderJobId: uniqueRenderJobId }
    });

    // Fetch storyboard
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
      
      const { data: scenes } = await supabaseClient
        .from('storyboard_scenes')
        .select('voice_over_text')
        .eq('storyboard_id', storyboardId)
        .order('order_number', { ascending: true });
      
      const initialEstimate = storyboard.estimated_render_cost || (storyboard.duration * 0.25);
      const countChars = (text: string) => text?.trim().length || 0;
      
      const introChars = countChars(storyboard.intro_voiceover_text || '');
      const sceneChars = (scenes || []).reduce((sum: number, scene: { voice_over_text: string }) => sum + countChars(scene.voice_over_text), 0);
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
          headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Reset storyboard for re-render if confirmed
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
          notify_on_completion: notifyOnCompletion,
        })
        .eq('id', storyboardId);
      
      if (resetError) {
        logger.error('Failed to reset storyboard', resetError instanceof Error ? resetError : undefined, {
          userId: user.id,
          metadata: { storyboardId }
        });
      }
    }

    // Fetch scenes
    const { data: scenes, error: scenesError } = await supabaseClient
      .from('storyboard_scenes')
      .select('id, order_number, voice_over_text, image_prompt, image_preview_url, video_url')
      .eq('storyboard_id', storyboardId)
      .order('order_number', { ascending: true });

    if (scenesError || !scenes || scenes.length === 0) {
      throw new Error('No scenes found');
    }

    // Validate scenes
    for (const scene of scenes) {
      if (!scene.voice_over_text || !scene.image_prompt) {
        throw new Error('All scenes must have voiceover and image prompt');
      }
    }

    // Calculate cost
    const initialEstimate = storyboard.estimated_render_cost || (storyboard.duration * 0.25);
    
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      throw new Error('Could not fetch user subscription');
    }

    const countChars = (text: string) => text?.trim().length || 0;
    const introChars = countChars(storyboard.intro_voiceover_text || '');
    const sceneChars = scenes.reduce((sum, scene) => sum + countChars(scene.voice_over_text), 0);
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
    
    logger.info('Cost calculated', {
      userId: user.id,
      metadata: { initialEstimate, actualCost: actualCost.toFixed(2), charDifference }
    });

    if (subscription.tokens_remaining < actualCost) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient credits. Need ${actualCost.toFixed(2)} credits to render video.` 
        }),
        { status: 402, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Charge credits
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

    // Update cost in storyboard
    await supabaseClient
      .from('storyboards')
      .update({ estimated_render_cost: actualCost })
      .eq('id', storyboardId);

    // Build JSON2Video inline payload
    const json2videoApiKey = Deno.env.get('JSON2VIDEO_API_KEY');
    if (!json2videoApiKey) {
      throw new Error('JSON2VIDEO_API_KEY not configured');
    }

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/json2video-webhook`;
    const aspectRatioConfig = mapAspectRatio(
      storyboard.aspect_ratio || 'instagram-feed',
      storyboard.custom_width,
      storyboard.custom_height
    );
    const verticalHeight = getVerticalHeight(storyboard.aspect_ratio || 'instagram-feed');

    // Determine intro media source
    let introMediaSrc = '';
    let introMediaType: 'video' | 'image' = 'video';
    
    if (storyboard.intro_video_url) {
      introMediaSrc = storyboard.intro_video_url;
      introMediaType = 'video';
    } else if (isVideoUrl(storyboard.intro_image_preview_url)) {
      introMediaSrc = storyboard.intro_image_preview_url;
      introMediaType = 'video';
    } else if (storyboard.intro_image_preview_url) {
      introMediaSrc = storyboard.intro_image_preview_url;
      introMediaType = 'image';
    }

    // Build scenes array for variables
    const scenesVariables = scenes.map(s => {
      let mediaUrl = '';
      if (s.video_url) {
        mediaUrl = s.video_url;
      } else if (isVideoUrl(s.image_preview_url)) {
        mediaUrl = s.image_preview_url;
      } else if (s.image_preview_url) {
        mediaUrl = s.image_preview_url;
      }
      
      return {
        voiceOverText: s.voice_over_text,
        videoUrl: mediaUrl,
      };
    });

    // Build the INLINE movie structure (matching user's working sample)
    const renderPayload: Record<string, unknown> = {
      // Metadata
      comment: "Storyboard video render (inline)",
      id: generateElementId(),
      project: uniqueRenderJobId,
      
      // Resolution settings
      ...aspectRatioConfig,
      fps: 25,
      quality: storyboard.video_quality || 'high',
      cache: storyboard.enable_cache ?? true,
      draft: storyboard.draft_mode ?? false,
      
      // Variables for template interpolation within elements
      variables: {
        // Subtitle settings
        subtitlesModel: storyboard.subtitles_model || 'default',
        keywords: storyboard.subtitle_settings?.keywords || [],
        subtitleStyle: storyboard.subtitle_settings?.style || 'boxed-word',
        fontUrl: storyboard.subtitle_settings?.fontUrl || '',
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
        
        // Voice settings
        voiceModel: storyboard.voice_model || 'azure',
        voiceID: storyboard.voice_id,
        
        // Music settings
        musicFadeIn: storyboard.music_settings?.fadeIn ?? 2,
        musicFadeOut: storyboard.music_settings?.fadeOut ?? 2,
        musicVolume: storyboard.music_settings?.volume ?? 0.05,
        
        // Image model (for AI generation if needed)
        imageModel: storyboard.image_model || 'freepik-classic',
        audioURL: storyboard.background_music_url || '',
        
        // Intro content
        introText: storyboard.intro_voiceover_text || '',
        introVideoUrl: introMediaSrc,
        
        // Scenes array for iteration
        scenes: scenesVariables,
      },
      
      // Global elements - subtitles + background music
      elements: [
        {
          type: "subtitles",
          id: generateElementId(),
          comment: "Subtitles",
          language: "auto",
          model: "{{subtitlesModel}}",
          settings: {
            "style": "{{subtitleStyle}}",
            "font-family": "{{fontFamily}}",
            "font-size": "{{fontSize}}",
            "all-caps": "{{allCaps}}",
            "box-color": "{{boxColor}}",
            "line-color": "{{lineColor}}",
            "word-color": "{{wordColor}}",
            "outline-color": "{{outlineColor}}",
            "outline-width": "{{outlineWidth}}",
            "shadow-color": "{{shadowColor}}",
            "shadow-offset": "{{shadowOffset}}",
            "position": "{{position}}",
            "max-words-per-line": "{{maxWordsPerLine}}",
            "x": "{{x}}",
            "y": "{{y}}"
          }
        },
        // Conditionally include audio element if background music exists
        ...(storyboard.background_music_url ? [{
          type: "audio",
          id: generateElementId(),
          src: storyboard.background_music_url,
          volume: storyboard.music_settings?.volume ?? 0.05,
          duration: -2,
          "fade-in": storyboard.music_settings?.fadeIn ?? 2,
          "fade-out": storyboard.music_settings?.fadeOut ?? 2
        }] : [])
      ],
      
      // Scenes array - intro + iterable scenes
      scenes: [
        // Intro scene
        {
          id: generateElementId(),
          comment: "Intro",
          elements: [
            {
              type: introMediaType,
              id: generateElementId(),
              src: "{{introVideoUrl}}",
              duration: 8,
              volume: 0,
              position: "center-center",
              "aspect-ratio": "vertical",
              height: verticalHeight
            },
            {
              type: "voice",
              id: generateElementId(),
              text: "{{introText}}",
              voice: "{{voiceID}}",
              model: "{{voiceModel}}",
              volume: 1
            }
          ]
        },
        // Iterable scenes
        {
          id: generateElementId(),
          comment: "Scene X",
          iterate: "scenes",
          cache: false,
          elements: [
            {
              type: "video",
              id: generateElementId(),
              src: "{{videoUrl}}",
              duration: 8,
              volume: 0,
              position: "center-center",
              "aspect-ratio": "vertical",
              height: verticalHeight
            },
            {
              type: "voice",
              id: generateElementId(),
              text: "{{voiceOverText}}",
              voice: "{{voiceID}}",
              model: "{{voiceModel}}",
              volume: 1
            }
          ]
        }
      ],
      
      // Webhook export
      exports: [{
        destinations: [{
          type: "webhook",
          endpoint: webhookUrl,
          "content-type": "json"
        }]
      }]
    };

    logger.info('Calling JSON2Video API with inline payload', { 
      metadata: { 
        renderPayload: JSON.stringify(renderPayload),
        sceneCount: scenes.length 
      } 
    });

    // Call JSON2Video API
    const json2videoResponse = await fetch(API_ENDPOINTS.JSON2VIDEO.moviesUrl, {
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
      
      // Refund credits
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: actualCost
      });
      
      if (json2videoResponse.status === 429) {
        throw new Error('JSON2Video rate limit exceeded. Please try again later.');
      } else if (json2videoResponse.status === 401 || json2videoResponse.status === 403) {
        throw new Error('JSON2Video API authentication failed. Please contact support.');
      }
      
      throw new Error(`JSON2Video API error: ${json2videoResponse.status} - ${errorText}`);
    }

    const json2videoData = await json2videoResponse.json();
    logger.info('JSON2Video response received', { metadata: { project: json2videoData.project } });

    const json2videoProjectId = json2videoData.project;

    if (!json2videoProjectId) {
      logger.error('JSON2Video did not return a project ID');
      
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

    // Update storyboard status
    const { error: updateError } = await supabaseClient
      .from('storyboards')
      .update({
        status: 'rendering',
        render_job_id: json2videoProjectId,
        updated_at: new Date().toISOString()
      })
      .eq('id', storyboardId);

    if (updateError) {
      const errorMsg = updateError && typeof updateError === 'object' && 'message' in updateError ? updateError.message : 'Database error';
      logger.error('Status update error', updateError instanceof Error ? updateError : new Error(String(errorMsg)));
      
      await supabaseClient.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: initialEstimate
      });
      throw new Error('Failed to update storyboard status');
    }

    return new Response(
      JSON.stringify({
        jobId: json2videoProjectId,
        estimatedTime: 180,
        webhookConfigured: true,
        message: 'Video rendering started (inline mode). You will be notified when complete.',
        mode: 'inline'
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Render storyboard video (inline) error', error instanceof Error ? error : undefined);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
