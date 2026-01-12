import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { validateJsonbSize, MAX_JSONB_SIZE } from "../_shared/jsonb-validation-schemas.ts";
import { STORYBOARD_STATUS } from "../_shared/constants.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const logger = new EdgeLogger('generate-storyboard', requestId, supabaseClient, true);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) {
      logger.error('Authentication failed', authError instanceof Error ? authError : new Error('Auth failed'));
      throw new Error('Unauthorized');
    }
    const user = userData.user;

    // Check for in-progress storyboard generation (prevent duplicate submissions)
    const { data: inProgressStoryboard } = await supabaseClient
      .from('storyboards')
      .select('id, topic, created_at, status')
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (inProgressStoryboard) {
      logger.warn('Duplicate generation blocked - returning existing storyboard', {
        userId: user.id,
        metadata: { existingId: inProgressStoryboard.id, topic: inProgressStoryboard.topic }
      });
      
      // Return the existing storyboard instead of creating a new one
      const { data: existingScenes } = await supabaseClient
        .from('storyboard_scenes')
        .select('*')
        .eq('storyboard_id', inProgressStoryboard.id)
        .order('order_number');
      
      return new Response(
        JSON.stringify({
          storyboard: inProgressStoryboard,
          scenes: existingScenes || [],
          duplicate: true,
          message: 'Returning existing storyboard created recently'
        }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
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
      'sketch': 'Pencil sketch drawing, hand-drawn lines, artistic shading, paper texture, monochrome or light color wash, sketch art style',
      'pop-art': 'Pop art illustration, bold contrasting colors, halftone dots, comic-book style, screen-print texture, high energy composition'
    };

    // Validate style early (avoid DB constraint violations and confusing 500s)
    if (!style || !STYLE_GUIDELINES[style]) {
      const allowed = Object.keys(STYLE_GUIDELINES).join(', ');
      throw new Error(`Unsupported style: "${style}". Allowed styles: ${allowed}`);
    }

    const styleGuideline = STYLE_GUIDELINES[style];

// Prepare AI prompt with enhanced narrative structure for DUAL IMAGE generation
    // NEW: Split voiceover into two halves, generate distinct images for each half
    const systemPrompt = `You are a viral faceless video creator specializing in engaging, educational content that tells compelling stories.

OUTPUT FORMAT (strict JSON only):
{
  "comment": "Creative direction note",
  "variables": {
    "introLine1": "First line - attention-grabbing question or statement",
    "introLine2": "Second line - compelling hook that draws viewer in",
    "introImagePrompt": "${style} image matching introLine1",
    "introImagePrompt2": "${style} image matching introLine2",
    "introVoiceoverText": "introLine1\\nintroLine2",
    "scenes": [
      {
        "voiceOverText": "Full natural speaking sentence (10-15 words)",
        "voiceOverPart1": "First half of the sentence (~5-7 words)",
        "voiceOverPart2": "Second half of the sentence (~5-7 words)",
        ${mediaType === 'video' ? '"videoSearchQuery": "specific video search keywords"' : `"imagePrompt": "${style} image that DIRECTLY illustrates voiceOverPart1",
        "imagePrompt2": "${style} image that DIRECTLY illustrates voiceOverPart2"`}
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

${mediaType === 'image' ? `IMAGE PROMPTS (CONTENT-MATCHED DUAL IMAGE SYSTEM):
⚠️ CRITICAL: SPLIT VOICEOVER → SPLIT IMAGES ⚠️

STEP 1 - SPLIT THE VOICEOVER:
For each scene, split voiceOverText into two meaningful halves:
- voiceOverPart1: First half (~5-7 words) - the setup or first concept
- voiceOverPart2: Second half (~5-7 words) - the follow-up or second concept

STEP 2 - MATCH IMAGES TO CONTENT:
- imagePrompt: Create image that DIRECTLY illustrates what voiceOverPart1 says
- imagePrompt2: Create image that DIRECTLY illustrates what voiceOverPart2 says

EXAMPLE:
voiceOverText: "Ancient temples held secrets for centuries, until explorers discovered the hidden chamber"
voiceOverPart1: "Ancient temples held secrets for centuries"
voiceOverPart2: "until explorers discovered the hidden chamber"
imagePrompt: "${style} ${styleGuideline}, mysterious ancient temple exterior covered in vines, untouched and weathered by time"
imagePrompt2: "${style} ${styleGuideline}, explorer with torch illuminating a hidden underground chamber filled with artifacts"

INTRO IMAGES:
- introLine1: First line of intro voiceover
- introLine2: Second line of intro voiceover  
- introImagePrompt: Image matching introLine1
- introImagePrompt2: Image matching introLine2

❌ WRONG - Same concept twice:
  voiceOverPart1: "The ocean covers vast areas"
  voiceOverPart2: "of our planet's surface"
  imagePrompt: "vast ocean view"
  imagePrompt2: "vast ocean view from different angle"

✅ CORRECT - Different content, different images:
  voiceOverPart1: "The ocean covers vast areas"
  voiceOverPart2: "hiding mysteries in the depths"
  imagePrompt: "${style} ${styleGuideline}, aerial view of endless blue ocean stretching to the horizon"
  imagePrompt2: "${style} ${styleGuideline}, deep sea creatures and ancient shipwreck in dark ocean depths"

All prompts MUST start with "${style}" then add "${styleGuideline}"
Since each image matches DIFFERENT content, they will naturally be DIFFERENT!` : ''}

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

    logger.info('Calling Lovable AI Gateway', { 
      userId: user.id,
      metadata: { topic, duration, style, mediaType, sceneCount }
    });
    
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
      logger.error('AI API error', undefined, {
        userId: user.id,
        metadata: { status: aiResponse.status, error: errorText.substring(0, 200) }
      });
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please contact support.');
      }
      
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0].message.content;
    
    logger.debug('Raw AI response received', { userId: user.id });
    
    // Strip markdown code blocks if present
    content = content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      logger.debug('Stripped markdown code blocks', { userId: user.id });
    }
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
      logger.debug('Parsed AI response', { 
        userId: user.id,
        metadata: { keys: Object.keys(parsedContent) }
      });
    } catch (parseError) {
      logger.error('JSON parse error', parseError instanceof Error ? parseError : undefined, {
        userId: user.id,
        metadata: { content_preview: content.substring(0, 200) }
      });
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }
    
    // Try multiple possible response formats
    let introImagePrompt, introImagePrompt2, introVoiceoverText, scenes;
    
    if (parsedContent.variables?.scenes) {
      // Format 1: Expected format with nested variables
      logger.debug('Using nested variables format', { userId: user.id });
      ({ introImagePrompt, introImagePrompt2, introVoiceoverText, scenes } = parsedContent.variables);
    } else if (parsedContent.scenes) {
      // Format 2: Scenes at root level
      logger.debug('Using root level scenes format', { userId: user.id });
      scenes = parsedContent.scenes;
      
      // Check variables first (AI sometimes puts scenes at root but intro under variables)
      introImagePrompt = parsedContent.variables?.introImagePrompt 
        || parsedContent.introImagePrompt 
        || parsedContent.intro_image_prompt;
      introImagePrompt2 = parsedContent.variables?.introImagePrompt2 
        || parsedContent.introImagePrompt2 
        || parsedContent.intro_image_prompt_2;
      introVoiceoverText = parsedContent.variables?.introVoiceoverText 
        || parsedContent.introVoiceoverText 
        || parsedContent.intro_voiceover_text;
      
      if (!introImagePrompt || !introVoiceoverText) {
        logger.warn('Missing intro fields', {
          userId: user.id,
          metadata: { variables: parsedContent.variables }
        });
      }
    } else if (parsedContent.data?.scenes) {
      // Format 3: Nested under data
      logger.debug('Using data.scenes format', { userId: user.id });
      scenes = parsedContent.data.scenes;
      introImagePrompt = parsedContent.data.introImagePrompt || parsedContent.data.intro_image_prompt;
      introImagePrompt2 = parsedContent.data.introImagePrompt2 || parsedContent.data.intro_image_prompt_2;
      introVoiceoverText = parsedContent.data.introVoiceoverText || parsedContent.data.intro_voiceover_text;
    } else {
      logger.error('Unknown response structure', undefined, {
        userId: user.id,
        metadata: { keys: Object.keys(parsedContent) }
      });
      throw new Error(`Invalid AI response format. Expected 'scenes' array but got: ${JSON.stringify(Object.keys(parsedContent))}`);
    }
    
    // Helper to check if two prompts are too similar (more than 80% overlap)
    const arePromptsTooSimilar = (prompt1: string, prompt2: string): boolean => {
      if (!prompt1 || !prompt2) return false;
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const p1 = normalize(prompt1);
      const p2 = normalize(prompt2);
      if (p1 === p2) return true;
      // Check word overlap
      const words1 = new Set(p1.split(/\s+/));
      const words2 = new Set(p2.split(/\s+/));
      const intersection = [...words1].filter(w => words2.has(w)).length;
      const overlap = intersection / Math.max(words1.size, words2.size);
      return overlap > 0.8;
    };

    // Validate scenes array
    if (!Array.isArray(scenes) || scenes.length === 0) {
      logger.error('Invalid scenes array', undefined, {
        userId: user.id,
        metadata: { scenes_length: scenes?.length }
      });
      throw new Error(`Invalid scenes array. Expected array with ${sceneCount} scenes, got: ${scenes ? scenes.length : 'null'}`);
    }
    
    if (scenes.length !== sceneCount) {
      logger.warn('Scene count mismatch', {
        userId: user.id,
        metadata: { expected: sceneCount, got: scenes.length }
      });
    }
    
    // Validate required scene properties
    interface SceneData {
      voiceOverText?: string;
      voice_over_text?: string;
      voiceOverPart1?: string;
      voice_over_part_1?: string;
      voiceOverPart2?: string;
      voice_over_part_2?: string;
      videoSearchQuery?: string;
      video_search_query?: string;
      imagePrompt?: string;
      image_prompt?: string;
      imagePrompt2?: string;
      image_prompt_2?: string;
    }

    // Helper function to split voiceover text into two halves
    const splitVoiceover = (text: string): { part1: string; part2: string } => {
      if (!text) return { part1: '', part2: '' };
      
      // Try to split at natural break points: comma, semicolon, "but", "and", "while", "as", "until"
      const breakPatterns = [
        /,\s+/,                           // comma
        /;\s+/,                           // semicolon
        /\s+but\s+/i,                     // "but"
        /\s+and\s+/i,                     // "and" 
        /\s+while\s+/i,                   // "while"
        /\s+as\s+/i,                      // "as"
        /\s+until\s+/i,                   // "until"
        /\s+when\s+/i,                    // "when"
        /\s+then\s+/i,                    // "then"
      ];
      
      for (const pattern of breakPatterns) {
        const match = text.match(pattern);
        if (match && match.index) {
          const splitIndex = match.index + match[0].length;
          const part1 = text.substring(0, match.index).trim();
          const part2 = text.substring(splitIndex).trim();
          // Only use this split if both parts have reasonable length
          if (part1.length >= 10 && part2.length >= 10) {
            return { part1, part2 };
          }
        }
      }
      
      // Fallback: split at middle word boundary
      const words = text.split(/\s+/);
      const midPoint = Math.ceil(words.length / 2);
      return {
        part1: words.slice(0, midPoint).join(' '),
        part2: words.slice(midPoint).join(' ')
      };
    };

    const invalidScenes = scenes.filter((scene: SceneData, index: number) => {
      const hasVoiceOver = scene.voiceOverText || scene.voice_over_text;
      const hasMedia = mediaType === 'video'
        ? (scene.videoSearchQuery || scene.video_search_query)
        : (scene.imagePrompt || scene.image_prompt);

      if (!hasVoiceOver || !hasMedia) {
        logger.error('Scene missing required fields', undefined, {
          userId: user.id,
          metadata: { scene_index: index + 1, scene }
        });
        return true;
      }
      return false;
    });
    
    if (invalidScenes.length > 0) {
      throw new Error(`${invalidScenes.length} scenes missing required fields (voiceOverText and ${mediaType === 'video' ? 'videoSearchQuery' : 'imagePrompt'})`);
    }
    
    // Log if AI provided split voiceover parts
    const scenesWithSplitVoiceover = scenes.filter((scene: SceneData) => 
      scene.voiceOverPart1 || scene.voice_over_part_1 || scene.voiceOverPart2 || scene.voice_over_part_2
    );
    logger.info('Voiceover split analysis', {
      userId: user.id,
      metadata: { 
        total_scenes: scenes.length,
        scenes_with_ai_split: scenesWithSplitVoiceover.length,
        will_use_fallback: scenes.length - scenesWithSplitVoiceover.length
      }
    });
    
    logger.info('Successfully validated AI response', {
      userId: user.id,
      metadata: { scene_count: scenes.length }
    });

    // Calculate original character count for pricing
    const countChars = (text: string) => text?.trim().length || 0;
    const introChars = countChars(introVoiceoverText || '');
    const sceneChars = scenes.reduce((sum: number, scene: SceneData) => {
      const voiceText = scene.voiceOverText || scene.voice_over_text || '';
      return sum + countChars(voiceText);
    }, 0);
    const originalCharacterCount = introChars + sceneChars;
    
    logger.info('Character count calculated', {
      userId: user.id,
      metadata: { total: originalCharacterCount, intro: introChars, scenes: sceneChars }
    });

    // Validate JSONB settings before insertion (DoS prevention)
    if (subtitleSettings && !validateJsonbSize(subtitleSettings)) {
      logger.error('Subtitle settings exceed size limit', undefined, {
        userId: user.id,
        metadata: { size: JSON.stringify(subtitleSettings).length, limit: MAX_JSONB_SIZE }
      });
      throw new Error('Subtitle settings exceed maximum size (50KB)');
    }

    if (musicSettings && !validateJsonbSize(musicSettings)) {
      logger.error('Music settings exceed size limit', undefined, {
        userId: user.id,
        metadata: { size: JSON.stringify(musicSettings).length, limit: MAX_JSONB_SIZE }
      });
      throw new Error('Music settings exceed maximum size (50KB)');
    }

    if (imageAnimationSettings && !validateJsonbSize(imageAnimationSettings)) {
      logger.error('Image animation settings exceed size limit', undefined, {
        userId: user.id,
        metadata: { size: JSON.stringify(imageAnimationSettings).length, limit: MAX_JSONB_SIZE }
      });
      throw new Error('Image animation settings exceed maximum size (50KB)');
    }

    logger.debug('JSONB validation passed', { userId: user.id });

    // Ensure intro image prompts are distinct
    // Intro voiceover typically has two lines separated by \n
    let finalIntroImagePrompt2 = introImagePrompt2;
    if (!introImagePrompt2 || arePromptsTooSimilar(introImagePrompt, introImagePrompt2)) {
      // Try to create distinct prompt from second line of intro voiceover
      const introLines = (introVoiceoverText || '').split('\n').filter((l: string) => l.trim());
      if (introLines.length >= 2) {
        finalIntroImagePrompt2 = `${style} ${styleGuideline}, close-up perspective illustrating: ${introLines[1]}`;
        logger.debug('Generated distinct intro_image_prompt_2 from second voiceover line', {
          userId: user.id,
          metadata: { line2: introLines[1] }
        });
      } else {
        finalIntroImagePrompt2 = `${introImagePrompt}, different angle close-up detail shot`;
      }
    }

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
        intro_image_prompt_2: finalIntroImagePrompt2,
        intro_voiceover_text: introVoiceoverText,
        tokens_cost: tokenCost,
        status: STORYBOARD_STATUS.DRAFT,
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
        subtitle_language: subtitleSettings?.language || 'en',
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
      logger.error('Storyboard creation error', new Error(storyboardError.message), {
        userId: user.id,
        metadata: {
          code: storyboardError.code,
          details: storyboardError.details,
          hint: storyboardError.hint,
        },
      });
      throw new Error(`Failed to create storyboard: ${storyboardError.message}`);
    }

    // Insert scenes - handle both camelCase and snake_case formats from AI
    // Now includes dual image prompts based on split voiceover content
    // Ensures imagePrompt and imagePrompt2 are distinct
    
    // Helper to create a distinct second prompt based on voiceover part
    const ensureDistinctPrompt2 = (
      prompt1: string | null, 
      prompt2: string | null, 
      voiceOverText: string,
      stylePrefix: string
    ): string | null => {
      if (!prompt1) return null;
      
      // If prompt2 exists and is distinct, use it
      if (prompt2 && !arePromptsTooSimilar(prompt1, prompt2)) {
        return prompt2;
      }
      
      // Split voiceover and create a prompt for the second half
      const { part2 } = splitVoiceover(voiceOverText);
      if (part2 && part2.length > 5) {
        // Create a more focused prompt based on the second half content
        const distinctPrompt = `${stylePrefix} ${styleGuideline}, close-up perspective illustrating: ${part2}`;
        logger.debug('Generated fallback prompt2 from voiceover split', {
          userId: user.id,
          metadata: { part2, original_prompt2: prompt2?.substring(0, 50) }
        });
        return distinctPrompt;
      }
      
      // Last resort: append differentiation to prompt1
      return `${prompt1}, different angle close-up detail shot`;
    };
    
    const scenesData = scenes.map((scene: SceneData, index: number) => {
      const voiceOverText = scene.voiceOverText || scene.voice_over_text || '';
      const imagePrompt = mediaType === 'image' || mediaType === 'animated' 
        ? (scene.imagePrompt || scene.image_prompt || null) 
        : null;
      const rawImagePrompt2 = scene.imagePrompt2 || scene.image_prompt_2 || null;
      
      // Ensure imagePrompt2 is distinct from imagePrompt
      const imagePrompt2 = mediaType === 'image' || mediaType === 'animated'
        ? ensureDistinctPrompt2(imagePrompt, rawImagePrompt2, voiceOverText, style)
        : null;
      
      return {
        storyboard_id: storyboard.id,
        order_number: index + 1,
        voice_over_text: voiceOverText,
        image_prompt: imagePrompt,
        image_prompt_2: imagePrompt2,
        video_search_query: mediaType === 'video'
          ? (scene.videoSearchQuery || scene.video_search_query || null)
          : null,
        video_url: null, // Will be populated later via video search
        is_edited: false
      };
    });

    logger.debug('Inserting scenes', {
      userId: user.id,
      metadata: { sceneCount: scenesData.length, sampleScene: scenesData[0] }
    });

    const { data: createdScenes, error: scenesError } = await supabaseClient
      .from('storyboard_scenes')
      .insert(scenesData)
      .select();

    if (scenesError) {
      logger.error('Scenes creation error', new Error(scenesError.message), {
        userId: user.id,
        metadata: { 
          code: scenesError.code, 
          details: scenesError.details,
          hint: scenesError.hint 
        }
      });
      throw new Error(`Failed to create scenes: ${scenesError.message}`);
    }

    logger.logDuration('Storyboard generation completed', startTime, {
      userId: user.id,
      metadata: {
        storyboard_id: storyboard.id,
        scene_count: createdScenes.length,
        tokens_cost: tokenCost
      }
    });

    return new Response(
      JSON.stringify({
        storyboard,
        scenes: createdScenes,
        tokensUsed: tokenCost
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return createSafeErrorResponse(error, 'generate-storyboard', responseHeaders);
  }
});