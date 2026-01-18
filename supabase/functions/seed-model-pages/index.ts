import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { MODEL_METADATA, type ModelMetadata } from "../_shared/model-metadata.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hidden providers to display as ARTIFIO
const HIDDEN_PROVIDERS = ['Kie AI', 'Kie.ai', 'kie_ai', 'Runware', 'runware', 'lovable_ai_sync'];
const DEFAULT_DISPLAY_PROVIDER = 'ARTIFIO';

function getDisplayProvider(provider: string): string {
  if (!provider) return DEFAULT_DISPLAY_PROVIDER;
  const normalizedProvider = provider.toLowerCase().replace(/[.\s_-]/g, '');
  const isHidden = HIDDEN_PROVIDERS.some(hidden => {
    const normalizedHidden = hidden.toLowerCase().replace(/[.\s_-]/g, '');
    return normalizedProvider === normalizedHidden || normalizedProvider.includes(normalizedHidden);
  });
  return isHidden ? DEFAULT_DISPLAY_PROVIDER : provider;
}

function formatContentType(contentType: string): string {
  const typeMap: Record<string, string> = {
    'prompt_to_image': 'Text to Image',
    'image_editing': 'Image Editing',
    'image_to_image': 'Image to Image',
    'image_to_video': 'Image to Video',
    'prompt_to_video': 'Text to Video',
    'video_to_video': 'Video to Video',
    'lip_sync': 'Lip Sync',
    'prompt_to_audio': 'Text to Audio',
  };
  return typeMap[contentType] || contentType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function contentTypeToCategory(contentType: string): string {
  const categoryMap: Record<string, string> = {
    'prompt_to_image': 'Image Generation',
    'image_editing': 'Image Editing',
    'image_to_image': 'Image Editing',
    'image_to_video': 'Video Generation',
    'prompt_to_video': 'Video Generation',
    'video_to_video': 'Video Editing',
    'lip_sync': 'Lip Sync',
    'prompt_to_audio': 'Audio Generation',
  };
  return categoryMap[contentType] || 'AI Generation';
}

function generateSlug(modelName: string): string {
  return modelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/--+/g, '-');
}

function generateHighlights(contentType: string, modelName: string): object[] {
  const baseHighlights = [
    { icon: "Zap", title: "Fast Generation", description: "Get results in seconds with optimized processing" },
    { icon: "Sparkles", title: "High Quality", description: "Professional-grade outputs for any use case" },
    { icon: "Shield", title: "Safe & Reliable", description: "Built-in content moderation and safety features" },
  ];

  if (contentType.includes('video')) {
    return [
      { icon: "Video", title: "Cinematic Quality", description: "Create stunning video content with AI" },
      { icon: "Clock", title: "Multiple Durations", description: "Generate 5-10 second video clips" },
      { icon: "Sparkles", title: "Smooth Motion", description: "Natural movement and transitions" },
    ];
  }

  if (contentType === 'prompt_to_audio') {
    return [
      { icon: "Music", title: "High Fidelity Audio", description: "Crystal clear audio generation" },
      { icon: "Mic", title: "Natural Voice", description: "Realistic text-to-speech capabilities" },
      { icon: "Waveform", title: "Multiple Styles", description: "Various audio styles and genres" },
    ];
  }

  if (contentType === 'image_editing') {
    return [
      { icon: "Wand2", title: "Smart Editing", description: "AI-powered image transformations" },
      { icon: "Layers", title: "Preserve Quality", description: "Maintain original image quality" },
      { icon: "Palette", title: "Creative Control", description: "Fine-tune every aspect of your edit" },
    ];
  }

  if (contentType === 'lip_sync') {
    return [
      { icon: "Mic", title: "Realistic Lip Sync", description: "Accurate audio-to-lip synchronization" },
      { icon: "Video", title: "High Quality Video", description: "Professional-grade output" },
      { icon: "Zap", title: "Fast Processing", description: "Quick turnaround times" },
    ];
  }

  return baseHighlights;
}

function generateUseCases(contentType: string): object[] {
  if (contentType.includes('video')) {
    return [
      { title: "Social Media Content", description: "Create engaging video content for TikTok, Instagram Reels, and YouTube Shorts" },
      { title: "Marketing Campaigns", description: "Generate promotional videos and product showcases" },
      { title: "Creative Projects", description: "Bring your artistic vision to life with AI-powered video generation" },
    ];
  }

  if (contentType === 'prompt_to_audio') {
    return [
      { title: "Podcast Production", description: "Generate professional voiceovers and audio content" },
      { title: "Music Creation", description: "Create original music and soundtracks" },
      { title: "Content Narration", description: "Add voice narration to videos and presentations" },
    ];
  }

  if (contentType === 'lip_sync') {
    return [
      { title: "Avatar Animation", description: "Create talking avatars from static images" },
      { title: "Video Dubbing", description: "Sync audio to video for multilingual content" },
      { title: "Character Animation", description: "Bring characters to life with realistic lip movements" },
    ];
  }

  return [
    { title: "Marketing & Advertising", description: "Create eye-catching visuals for campaigns and social media" },
    { title: "Product Design", description: "Quickly visualize concepts and iterate on ideas" },
    { title: "Creative Projects", description: "Explore artistic possibilities with AI-powered generation" },
  ];
}

function generateFAQs(modelName: string, displayProvider: string, baseCost: number, contentType: string): object[] {
  const contentTypeLabel = formatContentType(contentType);
  return [
    {
      question: `How much does ${modelName} cost?`,
      answer: `${modelName} starts at ${baseCost} credits per generation. Costs may vary based on resolution, duration, and other parameters you select.`
    },
    {
      question: `What can I create with ${modelName}?`,
      answer: `${modelName} specializes in ${contentTypeLabel}. You can create professional-quality content for marketing, social media, creative projects, and more.`
    },
    {
      question: `How long does generation take?`,
      answer: `Generation times vary based on complexity and current demand. Most ${contentTypeLabel.toLowerCase()} generations complete within 30-120 seconds.`
    },
    {
      question: `Is ${modelName} available for commercial use?`,
      answer: `Yes! All content generated on ARTIFIO.ai can be used for commercial purposes. Check our terms of service for full details.`
    },
  ];
}

/**
 * Group models by model family or name for content type groups
 */
function groupModelsForPage(models: ModelMetadata[]): Record<string, ModelMetadata[]> {
  const groups: Record<string, ModelMetadata[]> = {};
  
  for (const model of models) {
    // Extract model family from modelId (e.g., "flux-2/pro" -> "FLUX 2")
    const modelIdParts = model.modelId.split('/')[0].split('-');
    let family = model.modelName.split(' ')[0]; // Default to first word of name
    
    // Try to get a better family name from the model name
    if (model.modelName.includes('FLUX')) {
      family = 'FLUX';
    } else if (model.modelName.includes('Google')) {
      family = 'Google';
    } else if (model.modelName.includes('Ideogram')) {
      family = 'Ideogram';
    } else if (model.modelName.includes('Nano Banana')) {
      family = 'Nano Banana';
    } else if (model.modelName.includes('Seedream')) {
      family = 'Seedream';
    } else if (model.modelName.includes('Qwen')) {
      family = 'Qwen';
    } else if (model.modelName.includes('Suno')) {
      family = 'Suno';
    } else if (model.modelName.includes('ElevenLabs')) {
      family = 'ElevenLabs';
    } else if (model.modelName.includes('Kling')) {
      family = 'Kling';
    } else if (model.modelName.includes('Veo')) {
      family = 'Veo';
    }
    
    if (!groups[family]) {
      groups[family] = [];
    }
    groups[family].push(model);
  }
  
  return groups;
}

/**
 * Convert MODEL_METADATA to array of active models
 */
function getActiveModels(): ModelMetadata[] {
  return Object.values(MODEL_METADATA).filter(model => model.isActive);
}

/**
 * Group active models by a unique key (model name family) to avoid duplicates
 * We want ONE page per unique model "family", not per record ID
 */
function getUniqueModelPages(): Map<string, ModelMetadata[]> {
  const activeModels = getActiveModels();
  const pageGroups = new Map<string, ModelMetadata[]>();
  
  for (const model of activeModels) {
    // Create a unique key based on model name (normalized)
    // This groups different content types of the same model together
    let pageKey = model.modelName
      .replace(/\s+(Text-to-Image|Image-to-Image|Text to Image|Image to Video|Video to Video|Lip Sync|Edit|Editing|I2I|T2I|Upscale|Remix|Reframe)$/i, '')
      .trim();
    
    // Handle special cases for cleaner grouping
    if (model.modelName.includes('FLUX 2 Pro')) pageKey = 'FLUX 2 Pro';
    if (model.modelName.includes('FLUX 2 Flex')) pageKey = 'FLUX 2 Flex';
    if (model.modelName.includes('FLUX.1 Kontext Max')) pageKey = 'FLUX.1 Kontext Max';
    if (model.modelName.includes('FLUX.1 Kontext Pro')) pageKey = 'FLUX.1 Kontext Pro';
    if (model.modelName.includes('Google Imagen 4 Fast')) pageKey = 'Google Imagen 4 Fast';
    if (model.modelName.includes('Google Imagen 4 Ultra')) pageKey = 'Google Imagen 4 Ultra';
    if (model.modelName.includes('Google Imagen 4') && !model.modelName.includes('Fast') && !model.modelName.includes('Ultra')) pageKey = 'Google Imagen 4';
    if (model.modelName.includes('Google Image Upscale')) pageKey = 'Google Image Upscale';
    if (model.modelName.includes('Google Veo')) {
      if (model.modelName.includes('Fast')) pageKey = 'Google Veo 3.1 Fast';
      else if (model.modelName.includes('HQ')) pageKey = 'Google Veo 3.1 HQ';
      else if (model.modelName.includes('Reference')) pageKey = 'Google Veo 3.1 Reference';
      else pageKey = 'Google Veo';
    }
    if (model.modelName.includes('Ideogram Character')) pageKey = 'Ideogram Character';
    if (model.modelName.includes('Ideogram V2')) pageKey = 'Ideogram V2+';
    if (model.modelName.includes('Ideogram V3 Reframe')) pageKey = 'Ideogram V3 Reframe';
    if (model.modelName.includes('Ideogram Image Remix')) pageKey = 'Ideogram Image Remix';
    if (model.modelName.includes('Ideogram V3') && !model.modelName.includes('Reframe') && !model.modelName.includes('Remix')) pageKey = 'Ideogram V3';
    if (model.modelName.includes('Nano Banana Pro')) pageKey = 'Nano Banana Pro';
    if (model.modelName.includes('Nano Banana by Google')) pageKey = 'Nano Banana by Google';
    if (model.modelName.includes('Nano Banana') && !model.modelName.includes('Pro') && !model.modelName.includes('Google')) pageKey = 'Nano Banana';
    if (model.modelName.includes('Seedream V4.5') || model.modelName.includes('Seedream 4.5')) pageKey = 'Seedream V4.5';
    if (model.modelName.includes('Seedream V4') && !model.modelName.includes('.5')) pageKey = 'Seedream V4';
    if (model.modelName.includes('Seedream V3')) pageKey = 'Seedream V3';
    if (model.modelName.includes('Kling 2.0')) pageKey = 'Kling 2.0';
    if (model.modelName.includes('Kling 2.1')) pageKey = 'Kling 2.1';
    if (model.modelName.includes('Kling 1.6')) pageKey = 'Kling 1.6';
    if (model.modelName.includes('ChatGPT 4o')) pageKey = 'ChatGPT 4o Image';
    if (model.modelName.includes('GPT Image 1.5')) pageKey = 'GPT Image 1.5';
    if (model.modelName.includes('Suno V5')) pageKey = 'Suno V5';
    if (model.modelName.includes('Suno V4.5')) {
      if (model.modelName.includes('+')) pageKey = 'Suno V4.5+';
      else if (model.modelName.includes('ALL')) pageKey = 'Suno V4.5ALL';
      else pageKey = 'Suno V4.5';
    }
    if (model.modelName.includes('Suno V4') && !model.modelName.includes('.5')) pageKey = 'Suno V4';
    if (model.modelName === 'Suno') pageKey = 'Suno';
    if (model.modelName.includes('ElevenLabs Turbo')) pageKey = 'ElevenLabs Turbo V2.5';
    if (model.modelName.includes('ElevenLabs Multilingual')) pageKey = 'ElevenLabs Multilingual V2';
    if (model.modelName.includes('ElevenLabs Dialogue')) pageKey = 'ElevenLabs Dialogue V3';
    if (model.modelName.includes('Remove Background')) pageKey = 'Remove Background';
    if (model.modelName.includes('Crisp Image Upscale')) pageKey = 'Crisp Image Upscale';
    if (model.modelName.includes('Topaz')) pageKey = 'Topaz Image Upscale';
    if (model.modelName.includes('Qwen Image Editor')) pageKey = 'Qwen Image Editor Pro';
    if (model.modelName.includes('Qwen Image to Image')) pageKey = 'Qwen Image to Image';
    if (model.modelName.includes('Qwen Text to Image')) pageKey = 'Qwen Text to Image';
    if (model.modelName.includes('Grok Imagine')) pageKey = 'Grok Imagine';
    if (model.modelName.includes('Midjourney')) pageKey = 'Midjourney';
    if (model.modelName.includes('Infinitalk')) pageKey = 'Infinitalk';
    if (model.modelName.includes('Jasper')) pageKey = 'Jasper';
    if (model.modelName.includes('Ultra Detail')) pageKey = 'Ultra Detail';
    if (model.modelName.includes('HiDream Dev')) pageKey = 'HiDream Dev';
    if (model.modelName.includes('HiDream Fast')) pageKey = 'HiDream Fast';
    if (model.modelName.includes('Z-Image')) pageKey = 'Z-Image';
    if (model.modelName.includes('Flux.1 Dev')) pageKey = 'Flux.1 Dev';
    if (model.modelName.includes('Flux.1 Schnell') || model.modelName.includes('FLUX.1 Schnell')) pageKey = 'FLUX.1 Schnell';
    if (model.modelName.includes('FLUX.1 Pro')) pageKey = 'FLUX.1 Pro';
    if (model.modelName.includes('runware upscale')) pageKey = 'Runware Upscale';
    if (model.modelName.includes('Wan')) pageKey = model.modelName;
    if (model.modelName.includes('Minimax')) pageKey = model.modelName;
    if (model.modelName.includes('Luma')) pageKey = model.modelName;
    if (model.modelName.includes('Pika')) pageKey = model.modelName;
    if (model.modelName.includes('Hunyuan')) pageKey = model.modelName;
    
    if (!pageGroups.has(pageKey)) {
      pageGroups.set(pageKey, []);
    }
    pageGroups.get(pageKey)!.push(model);
  }
  
  return pageGroups;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[seed-model-pages] Starting seed from MODEL_METADATA...");

    // Get unique model pages
    const pageGroups = getUniqueModelPages();
    console.log(`[seed-model-pages] Found ${pageGroups.size} unique model page groups`);

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const [pageName, models] of pageGroups) {
      try {
        // Use the first model as the primary one for the page
        const primaryModel = models[0];
        const displayProvider = getDisplayProvider(primaryModel.provider);
        const slug = generateSlug(pageName);
        const category = contentTypeToCategory(primaryModel.contentType);
        
        // Build content type groups from all models in this page
        const contentTypeGroups: Record<string, { models: string[]; recordIds: string[] }> = {};
        for (const model of models) {
          const ctLabel = formatContentType(model.contentType);
          if (!contentTypeGroups[ctLabel]) {
            contentTypeGroups[ctLabel] = { models: [], recordIds: [] };
          }
          contentTypeGroups[ctLabel].models.push(model.modelName);
          contentTypeGroups[ctLabel].recordIds.push(model.recordId);
        }

        // Get all record IDs for this page
        const allRecordIds = models.map(m => m.recordId);

        // Check if page already exists by slug
        const { data: existingPage } = await supabase
          .from("model_pages")
          .select("id, slug")
          .eq("slug", slug)
          .maybeSingle();

        const pageData = {
          model_name: pageName,
          slug: slug,
          provider: displayProvider,
          category: category,
          model_record_id: primaryModel.recordId,
          model_record_ids: allRecordIds,
          meta_title: `${pageName} AI - Generate Content with ${displayProvider}`,
          meta_description: `Create stunning ${formatContentType(primaryModel.contentType).toLowerCase()} content with ${pageName}. Professional AI generation starting at ${primaryModel.baseCreditCost} credits.`,
          description: `${pageName} is a powerful AI model for ${formatContentType(primaryModel.contentType).toLowerCase()} generation. Create professional-quality content in seconds with our easy-to-use platform.`,
          tagline: `Professional ${formatContentType(primaryModel.contentType)} Generation`,
          highlights: generateHighlights(primaryModel.contentType, pageName),
          use_cases: generateUseCases(primaryModel.contentType),
          faqs: generateFAQs(pageName, displayProvider, primaryModel.baseCreditCost, primaryModel.contentType),
          content_type_groups: contentTypeGroups,
          specifications: {
            estimatedTime: `${primaryModel.estimatedTimeSeconds} seconds`,
            baseCost: `${primaryModel.baseCreditCost} credits`,
            contentTypes: models.map(m => formatContentType(m.contentType)),
          },
          is_published: true,
          is_featured: false,
          keywords: [pageName.toLowerCase(), displayProvider.toLowerCase(), category.toLowerCase()],
        };

        if (existingPage) {
          // Update existing page
          const { error } = await supabase
            .from("model_pages")
            .update(pageData)
            .eq("id", existingPage.id);

          if (error) {
            console.error(`[seed-model-pages] Error updating ${pageName}:`, error);
            results.errors.push(`Update ${pageName}: ${error.message}`);
          } else {
            console.log(`[seed-model-pages] Updated: ${pageName}`);
            results.updated++;
          }
        } else {
          // Insert new page
          const { error } = await supabase
            .from("model_pages")
            .insert(pageData);

          if (error) {
            console.error(`[seed-model-pages] Error creating ${pageName}:`, error);
            results.errors.push(`Create ${pageName}: ${error.message}`);
          } else {
            console.log(`[seed-model-pages] Created: ${pageName}`);
            results.created++;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[seed-model-pages] Error processing ${pageName}:`, message);
        results.errors.push(`${pageName}: ${message}`);
      }
    }

    console.log(`[seed-model-pages] Complete. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Model pages seeded from MODEL_METADATA",
        results,
        totalActiveModels: getActiveModels().length,
        totalPageGroups: pageGroups.size,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[seed-model-pages] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
