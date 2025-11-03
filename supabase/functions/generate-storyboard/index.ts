import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";

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

    const { 
      topic, 
      duration, 
      style, 
      tone, 
      voice_id: voiceID, 
      voice_name: voiceName, 
      media_type: mediaType = 'image', 
      background_music_url: backgroundMusicUrl = '',
      background_music_volume: backgroundMusicVolume = 5,
      aspect_ratio: aspectRatio = 'full-hd',
      video_quality: videoQuality = 'medium',
      custom_width: customWidth,
      custom_height: customHeight,
      subtitle_settings: subtitleSettings,
      music_settings: musicSettings,
      image_animation_settings: imageAnimationSettings,
      enable_cache: enableCache = true,
      draft_mode: draftMode = false,
    } = await req.json();

    // Validate inputs
    if (!topic || topic.length < 5 || topic.length > 500) {
      throw new Error('Topic must be between 5 and 500 characters');
    }

    if (!duration || duration < 15 || duration > 120 || duration % 5 !== 0) {
      throw new Error('Duration must be between 15 and 120 seconds in 5-second increments');
    }

    // Calculate scene count: (duration / 5) - 1
    const sceneCount = Math.floor(duration / 5) - 1;
    
    // Initial cost estimate: 0.25 credits per second of video duration
    const tokenCost = duration * 0.25;

    // Style-specific guidelines for enhanced prompts
    const STYLE_GUIDELINES: Record<string, string> = {
      'hyper-realistic': 'Ultra-realistic photography, 8K resolution, photorealistic lighting, professional camera, sharp focus, natural textures, high detail',
      'cinematic': 'Cinematic composition, dramatic lighting, film grain, color grading, wide-angle lens, movie-quality depth of field, professional cinematography',
      'animated': 'Pixar-style 3D animation, vibrant colors, soft lighting, high-quality CGI, rounded shapes, detailed textures, animated movie quality',
      'cartoon': '2D cartoon illustration, bold outlines, flat colors, playful proportions, hand-drawn aesthetic, expressive characters',
      'natural': 'Natural photography, authentic lighting, real-world setting, documentary style, genuine atmosphere, organic composition',
      'sketch': 'Pencil sketch drawing, hand-drawn lines, artistic shading, paper texture, monochrome or light color wash, sketch art style'
    };

    const styleGuideline = STYLE_GUIDELINES[style] || STYLE_GUIDELINES['hyper-realistic'];

    // Prepare AI prompt with enhanced narrative structure
    const systemPrompt = `You are a viral faceless video creator specializing in engaging, educational content that tells compelling stories.

OUTPUT FORMAT (strict JSON only):
{
  "comment": "Creative direction note",
  "variables": {
    "introImagePrompt": "${style} image prompt with detailed description",
    "introVoiceoverText": "Attention-grabbing title\\nCompelling hook line",
    "scenes": [
      {
        "voiceOverText": "Natural speaking sentence",
        ${mediaType === 'video' ? '"videoSearchQuery": "specific video search keywords",' : '"imagePrompt": "' + style + ' detailed visual description"'}
      }
    ]
  }
}

CRITICAL RULES:
- Generate exactly ${sceneCount} scenes
- Each scene voiceover = 10-15 words (takes ~5 seconds to speak naturally)
- Write voiceover that flows naturally when spoken aloud
- Tone: ${tone}

NARRATIVE STRUCTURE (CRITICAL):
- Scene 1: HOOK - Start with a surprising fact or question that grabs attention immediately
- Scenes 2-${sceneCount-1}: BUILD - Each scene reveals the next piece of the puzzle
  * Use transitional phrases: "But here's the twist...", "This is where it gets interesting...", "What happened next changed everything..."
  * Build suspense and curiosity that propels viewer forward
  * Each scene should naturally flow from the previous one
  * Create a progressive revelation of information
- Scene ${sceneCount}: PAYOFF - Satisfying conclusion that ties everything together with a memorable insight

STORY FLOW:
- NOT a list of disconnected facts
- YES a cohesive narrative journey with beginning, middle, and satisfying end
- Create emotional engagement through storytelling
- Use connective language between scenes
- Build momentum toward the conclusion

${mediaType === 'image' ? `IMAGE PROMPTS:
- MUST start with "${style}" 
- Then add: "${styleGuideline}"
- Then describe the specific scene content
- Example: "${style} ${styleGuideline}, showing [specific scene description]"
- Be highly detailed and specific` : ''}

${mediaType === 'video' ? `VIDEO SEARCH QUERIES:
- Provide 3-5 specific keywords for video stock footage
- Match the visual style and narrative beat
- Example: "aerial mountain sunrise cinematic"` : ''}

LANGUAGE:
- Use 6th-8th grade reading level
- Make it emotionally engaging and memorable
- Natural conversational tone`;

    const userPrompt = `Topic: ${topic}
Duration: ${duration}s (${sceneCount} scenes)
Media Type: ${mediaType === 'image' ? 'Static Images' : mediaType === 'video' ? 'Video Clips' : 'Animated Images'}

Create a compelling STORY (not just facts) about this topic. Each scene should flow naturally into the next, building curiosity and leading to a satisfying conclusion.`;

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
    
    console.log('[generate-storyboard] Raw AI response content:', content);
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
      console.log('[generate-storyboard] Parsed AI response structure:', JSON.stringify(Object.keys(parsedContent), null, 2));
    } catch (parseError) {
      console.error('[generate-storyboard] JSON parse error:', parseError);
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }
    
    // Try multiple possible response formats
    let introImagePrompt, introVoiceoverText, scenes;
    
    if (parsedContent.variables?.scenes) {
      // Format 1: Expected format with nested variables
      console.log('[generate-storyboard] Using nested variables format');
      ({ introImagePrompt, introVoiceoverText, scenes } = parsedContent.variables);
    } else if (parsedContent.scenes) {
      // Format 2: Scenes at root level
      console.log('[generate-storyboard] Using root level scenes format');
      scenes = parsedContent.scenes;
      
      // Check variables first (AI sometimes puts scenes at root but intro under variables)
      introImagePrompt = parsedContent.variables?.introImagePrompt 
        || parsedContent.introImagePrompt 
        || parsedContent.intro_image_prompt;
      introVoiceoverText = parsedContent.variables?.introVoiceoverText 
        || parsedContent.introVoiceoverText 
        || parsedContent.intro_voiceover_text;
      
      if (!introImagePrompt || !introVoiceoverText) {
        console.warn('[generate-storyboard] Missing intro fields. Variables:', 
          JSON.stringify(parsedContent.variables));
      }
    } else if (parsedContent.data?.scenes) {
      // Format 3: Nested under data
      console.log('[generate-storyboard] Using data.scenes format');
      scenes = parsedContent.data.scenes;
      introImagePrompt = parsedContent.data.introImagePrompt || parsedContent.data.intro_image_prompt;
      introVoiceoverText = parsedContent.data.introVoiceoverText || parsedContent.data.intro_voiceover_text;
    } else {
      console.error('[generate-storyboard] Unknown response structure:', JSON.stringify(parsedContent, null, 2));
      throw new Error(`Invalid AI response format. Expected 'scenes' array but got: ${JSON.stringify(Object.keys(parsedContent))}`);
    }
    
    // Validate scenes array
    if (!Array.isArray(scenes) || scenes.length === 0) {
      console.error('[generate-storyboard] Invalid scenes array:', scenes);
      throw new Error(`Invalid scenes array. Expected array with ${sceneCount} scenes, got: ${scenes ? scenes.length : 'null'}`);
    }
    
    if (scenes.length !== sceneCount) {
      console.warn(`[generate-storyboard] Scene count mismatch. Expected ${sceneCount}, got ${scenes.length}`);
    }
    
    // Validate required scene properties
    const invalidScenes = scenes.filter((scene: any, index: number) => {
      const hasVoiceOver = scene.voiceOverText || scene.voice_over_text;
      const hasMedia = mediaType === 'video' 
        ? (scene.videoSearchQuery || scene.video_search_query)
        : (scene.imagePrompt || scene.image_prompt);
      
      if (!hasVoiceOver || !hasMedia) {
        console.error(`[generate-storyboard] Scene ${index + 1} missing required fields:`, scene);
        return true;
      }
      return false;
    });
    
    if (invalidScenes.length > 0) {
      throw new Error(`${invalidScenes.length} scenes missing required fields (voiceOverText and ${mediaType === 'video' ? 'videoSearchQuery' : 'imagePrompt'})`);
    }
    
    console.log('[generate-storyboard] Successfully validated AI response with', scenes.length, 'scenes');

    // Calculate original character count for pricing
    const countChars = (text: string) => text?.trim().length || 0;
    const introChars = countChars(introVoiceoverText || '');
    const sceneChars = scenes.reduce((sum: number, scene: any) => {
      const voiceText = scene.voiceOverText || scene.voice_over_text || '';
      return sum + countChars(voiceText);
    }, 0);
    const originalCharacterCount = introChars + sceneChars;
    
    console.log('[generate-storyboard] Original character count:', originalCharacterCount, '(intro:', introChars, ', scenes:', sceneChars, ')');

    // Create storyboard record (no credit deduction - charged at render time)
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
        status: 'draft',
        media_type: mediaType,
        video_search_query: mediaType === 'video' ? topic : null,
        background_music_url: backgroundMusicUrl || null,
        background_music_volume: backgroundMusicUrl ? backgroundMusicVolume / 100 : 0.05,
        aspect_ratio: aspectRatio,
        video_quality: videoQuality,
        custom_width: customWidth,
        custom_height: customHeight,
        subtitle_settings: subtitleSettings || {
          position: 'mid-bottom-center',
          fontSize: 140,
          outlineColor: '#000000',
          outlineWidth: 8,
        },
        subtitle_language: subtitleSettings?.language || 'auto',
        subtitle_model: subtitleSettings?.model || 'default',
        subtitle_style: subtitleSettings?.style || 'boxed-word',
        subtitle_font_family: subtitleSettings?.['font-family'] || 'Oswald Bold',
        subtitle_all_caps: subtitleSettings?.['all-caps'] ?? false,
        subtitle_box_color: subtitleSettings?.['box-color'] || '#000000',
        subtitle_line_color: subtitleSettings?.['line-color'] || '#FFFFFF',
        subtitle_word_color: subtitleSettings?.['word-color'] || '#FFFF00',
        subtitle_shadow_color: subtitleSettings?.['shadow-color'] || '#000000',
        subtitle_shadow_offset: subtitleSettings?.['shadow-offset'] || 0,
        subtitle_max_words_per_line: subtitleSettings?.['max-words-per-line'] || 4,
        music_settings: musicSettings || {
          volume: 0.05,
          fadeIn: 2,
          fadeOut: 2,
          duration: -2,
        },
        image_animation_settings: imageAnimationSettings || {
          zoom: 2,
          position: 'center-center',
        },
        enable_cache: enableCache,
        draft_mode: draftMode,
        estimated_render_cost: tokenCost, // Store initial estimate for later comparison
        original_character_count: originalCharacterCount, // Store original script length for pricing
      })
      .select()
      .single();

    if (storyboardError) {
      console.error('Storyboard creation error:', storyboardError);
      throw new Error('Failed to create storyboard');
    }

    // Insert scenes
    const scenesData = scenes.map((scene: any, index: number) => ({
      storyboard_id: storyboard.id,
      order_number: index + 1,
      voice_over_text: scene.voiceOverText,
      image_prompt: mediaType === 'image' || mediaType === 'animated' ? scene.imagePrompt : null,
      video_url: null, // Will be populated later via video search
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
    return createSafeErrorResponse(error, 'generate-storyboard', corsHeaders);
  }
});