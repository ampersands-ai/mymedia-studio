import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

// Model data structure
interface ModelConfig {
  recordId: string;
  modelId: string;
  modelName: string;
  provider: string;
  contentType: string;
  baseCreditCost: number;
  estimatedTimeSeconds: number;
  isActive: boolean;
  modelFamily?: string | null;
  variantName?: string | null;
}

// Static model data - extracted from the registry for active models only
// This is a subset; in production, this would be generated from the actual registry
const MODEL_DATA: ModelConfig[] = [
  // PROMPT TO IMAGE - Active models
  { recordId: "3b83cee8-6164-4d98-aebe-f4eadcb3da1d", modelId: "4o-image-api", modelName: "ChatGPT 4o Image", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "ChatGPT 4o" },
  { recordId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", modelId: "flux-2-pro-t2i", modelName: "FLUX 2 Pro", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 8, estimatedTimeSeconds: 25, isActive: true, modelFamily: "FLUX 2" },
  { recordId: "b2c3d4e5-f6a7-8901-bcde-f12345678901", modelId: "flux-2-flex-t2i", modelName: "FLUX 2 Flex", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 6, estimatedTimeSeconds: 20, isActive: true, modelFamily: "FLUX 2" },
  { recordId: "c1bd50df-1c27-48a3-8630-0970eedd21f6", modelId: "flux-kontext-max-prompt", modelName: "FLUX.1 Kontext Max", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 12, estimatedTimeSeconds: 35, isActive: true, modelFamily: "FLUX Kontext" },
  { recordId: "94b43382-bf4b-490d-82b5-265d14473f9b", modelId: "flux-kontext-pro-prompt", modelName: "FLUX.1 Kontext Pro", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "FLUX Kontext" },
  { recordId: "5290ad50-ebeb-4fc0-97fb-bff7db6784b5", modelId: "google-imagen-4", modelName: "Google Imagen 4", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 15, estimatedTimeSeconds: 40, isActive: true, modelFamily: "Google Imagen" },
  { recordId: "0ff9bb96-041e-4c24-90c5-543064b642ca", modelId: "google-imagen-4-fast", modelName: "Google Imagen 4 Fast", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 10, estimatedTimeSeconds: 25, isActive: true, modelFamily: "Google Imagen" },
  { recordId: "23e81043-5e53-400b-bc1a-2a1ed9f30ce0", modelId: "google-imagen-4-ultra", modelName: "Google Imagen 4 Ultra", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 20, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Google Imagen" },
  { recordId: "49a79e90-830d-40ff-ad05-447cf0232592", modelId: "grok-imagine", modelName: "Grok Imagine", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 12, estimatedTimeSeconds: 30, isActive: true, modelFamily: "Grok" },
  { recordId: "a8f5c3e9-7d4b-6f2c-9a1e-5d8b3c7f4a6e", modelId: "ideogram-character", modelName: "Ideogram Character", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "Ideogram" },
  { recordId: "f9c5e7a3-8d4b-6f2c-9a1e-5d7b3c8f4a6e", modelId: "ideogram-v2-plus", modelName: "Ideogram V2+", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 8, estimatedTimeSeconds: 25, isActive: true, modelFamily: "Ideogram" },
  { recordId: "94c0e508-226a-4e3d-8229-3820a61faa88", modelId: "ideogram-v3", modelName: "Ideogram V3", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "Ideogram" },
  { recordId: "d8c5a7f3-9b4e-6f2c-8a1d-5e7b3c9f4a6e", modelId: "jasper-t2i", modelName: "Jasper Text to Image", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "Jasper" },
  { recordId: "eff6c62e-c20e-4eed-9f5b-81e1a7f01529", modelId: "midjourney", modelName: "Midjourney", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 15, estimatedTimeSeconds: 45, isActive: true, modelFamily: "Midjourney" },
  { recordId: "4c680009-d3fe-436f-85a7-467c76e85f9e", modelId: "nano-banana-lovable", modelName: "Nano Banana (Lovable AI)", provider: "lovable_ai_sync", contentType: "prompt_to_image", baseCreditCost: 1, estimatedTimeSeconds: 10, isActive: true, modelFamily: "Nano Banana" },
  { recordId: "09b03fa3-e648-4d42-8494-b91bd2e609b8", modelId: "nano-banana-google", modelName: "Nano Banana by Google", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 2, estimatedTimeSeconds: 15, isActive: true, modelFamily: "Nano Banana" },
  { recordId: "c5d6e7f8-9a0b-1c2d-3e4f-5a6b7c8d9e0f", modelId: "nano-banana-pro", modelName: "Nano Banana Pro", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 3, estimatedTimeSeconds: 20, isActive: true, modelFamily: "Nano Banana" },
  { recordId: "36246bd4-f2e5-472b-bcf8-3dd99bc313d8", modelId: "qwen-qwenvl", modelName: "Qwen Text to Image", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 8, estimatedTimeSeconds: 25, isActive: true, modelFamily: "Qwen" },
  { recordId: "ac90c626-ab01-4bc0-a000-9b952ddbde0e", modelId: "seedream-v3", modelName: "Seedream V3", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 8, estimatedTimeSeconds: 25, isActive: true, modelFamily: "Seedream" },
  { recordId: "c0e4f338-683a-4b5d-8289-518f2b5ea983", modelId: "seedream-v4", modelName: "Seedream V4", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "Seedream" },
  { recordId: "d5e6f7a8-9b0c-1d2e-3f4a-5b6c7d8e9f0a", modelId: "seedream-v4-5", modelName: "Seedream V4.5", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 12, estimatedTimeSeconds: 35, isActive: true, modelFamily: "Seedream" },
  { recordId: "f8c5a7e9-9d4b-6f2c-8a1e-5d7b3c9f4a6e", modelId: "ultra-detail-v0", modelName: "Ultra Detail V0", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 8, estimatedTimeSeconds: 25, isActive: true, modelFamily: "Ultra Detail" },
  { recordId: "b2c3d4e5-6a7b-8c9d-0e1f-2a3b4c5d6e7f", modelId: "gpt-image-1-5-t2i", modelName: "GPT Image 1.5", provider: "Kie AI", contentType: "prompt_to_image", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "GPT Image" },

  // IMAGE EDITING - Active models
  { recordId: "4b68811b-28be-45cb-bcae-9db721ba4547", modelId: "4o-image-api", modelName: "ChatGPT 4o Image", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "ChatGPT 4o" },
  { recordId: "00ef3f28-4fab-4244-b93f-0ba48641fcbd", modelId: "recraft-crisp-upscale", modelName: "Recraft Crisp Upscale", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 5, estimatedTimeSeconds: 15, isActive: true, modelFamily: "Recraft" },
  { recordId: "ab0ae096-f0ef-4197-b186-f38d69e72dd3", modelId: "flux-kontext-max-editing", modelName: "FLUX.1 Kontext Max", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 12, estimatedTimeSeconds: 35, isActive: true, modelFamily: "FLUX Kontext" },
  { recordId: "d0ef1f83-a613-47d4-82f8-10e41da3e2a0", modelId: "flux-kontext-pro-editing", modelName: "FLUX.1 Kontext Pro", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "FLUX Kontext" },
  { recordId: "e1f2a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b", modelId: "flux-2-flex-i2i", modelName: "FLUX 2 Flex Image-to-Image", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 6, estimatedTimeSeconds: 20, isActive: true, modelFamily: "FLUX 2" },
  { recordId: "f2e3d4c5-6b7a-8f9e-0d1c-2b3a4e5f6d7c", modelId: "flux-2-pro-i2i", modelName: "FLUX 2 Pro Image-to-Image", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 8, estimatedTimeSeconds: 25, isActive: true, modelFamily: "FLUX 2" },
  { recordId: "2959b083-2177-4b8c-ae56-31170c2eb9dc", modelId: "google-image-upscale", modelName: "Google Image Upscale", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 5, estimatedTimeSeconds: 15, isActive: true, modelFamily: "Google Imagen" },
  { recordId: "4a421ed9-ed0c-40bf-b06d-892871506124", modelId: "ideogram-character-editing", modelName: "Ideogram Character", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "Ideogram" },
  { recordId: "922ca567-5aa1-4fd3-86ba-587b723a5dbf", modelId: "ideogram-image-remix", modelName: "Ideogram Image Remix", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "Ideogram" },
  { recordId: "2c4802d0-f805-4c31-bab1-a07675e003eb", modelId: "ideogram-v3-reframe", modelName: "Ideogram V3 Reframe", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "Ideogram" },
  { recordId: "f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c", modelId: "midjourney-i2i", modelName: "Midjourney I2I", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 15, estimatedTimeSeconds: 45, isActive: true, modelFamily: "Midjourney" },
  { recordId: "a70d01a3-05de-4918-b934-55a7e5e5d407", modelId: "nano-banana-edit", modelName: "Nano Banana Edit", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 2, estimatedTimeSeconds: 15, isActive: true, modelFamily: "Nano Banana" },
  { recordId: "b4c5d6e7-8f9a-0b1c-2d3e-4f5a6b7c8d9e", modelId: "nano-banana-pro-editing", modelName: "Nano Banana Pro", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 3, estimatedTimeSeconds: 20, isActive: true, modelFamily: "Nano Banana" },
  { recordId: "b6d430f1-e823-4192-bf72-0dba29079931", modelId: "qwen-image-editor-pro", modelName: "Qwen Image Editor Pro", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "Qwen" },
  { recordId: "99532b69-d951-4431-87e3-1d88a9c8ee73", modelId: "qwen-i2i", modelName: "Qwen Image to Image", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 8, estimatedTimeSeconds: 25, isActive: true, modelFamily: "Qwen" },
  { recordId: "58b8b09f-57fd-42e3-ae2d-689e9ea3064d", modelId: "remove-background-kie", modelName: "Remove Background", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 2, estimatedTimeSeconds: 10, isActive: true, modelFamily: "Remove Background" },
  { recordId: "a3b4c5d6-7e8f-9a0b-1c2d-3e4f5a6b7c8d", modelId: "seedream-4-5", modelName: "Seedream 4.5", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 12, estimatedTimeSeconds: 35, isActive: true, modelFamily: "Seedream" },
  { recordId: "57f1e8f3-e4e3-42bd-bd9e-2f2ac6eee41d", modelId: "seedream-v4-editing", modelName: "Seedream V4", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "Seedream" },
  { recordId: "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d", modelId: "topaz-image-upscale", modelName: "Topaz Image Upscale", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 8, estimatedTimeSeconds: 20, isActive: true, modelFamily: "Topaz" },
  { recordId: "c3d4e5f6-7b8c-9d0e-1f2a-3b4c5d6e7f8a", modelId: "gpt-image-1-5-i2i", modelName: "GPT Image 1.5 I2I", provider: "Kie AI", contentType: "image_editing", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "GPT Image" },

  // IMAGE TO VIDEO - Active models
  { recordId: "8aac94cb-5625-47f4-880c-4f0fd8bd83a1", modelId: "google-veo-3-1-fast-i2v", modelName: "Google Veo 3.1 Fast", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 30, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Google Veo" },
  { recordId: "a5c2ec16-6294-4588-86b6-7b4182601cda", modelId: "google-veo-3-1-hq-i2v", modelName: "Google Veo 3.1 HQ", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 50, estimatedTimeSeconds: 120, isActive: true, modelFamily: "Google Veo" },
  { recordId: "6e8a863e-8630-4eef-bdbb-5b41f4c883f9", modelId: "google-veo-3-1-ref", modelName: "Google Veo 3.1 Reference", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 60, estimatedTimeSeconds: 150, isActive: true, modelFamily: "Google Veo" },
  { recordId: "8c46aade-1272-4409-bb3a-3701e2423320", modelId: "grok-imagine-i2v", modelName: "Grok Imagine", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 40, estimatedTimeSeconds: 90, isActive: true, modelFamily: "Grok" },
  { recordId: "f9b4c5d6-1e2f-3a4b-5c6d-7e8f9a0b1c2d", modelId: "hailuo-02-pro-i2v", modelName: "Hailuo 02 Pro", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 40, estimatedTimeSeconds: 90, isActive: true, modelFamily: "Hailuo" },
  { recordId: "a0c5d6e7-2f3a-4b5c-6d7e-8f9a0b1c2d3e", modelId: "hailuo-02-standard-i2v", modelName: "Hailuo 02 Standard", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 25, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Hailuo" },
  { recordId: "b1d6e7f8-3a4b-5c6d-7e8f-9a0b1c2d3e4f", modelId: "hailuo-23-pro-i2v", modelName: "Hailuo 2.3 Pro", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 50, estimatedTimeSeconds: 120, isActive: true, modelFamily: "Hailuo" },
  { recordId: "c2e7f8a9-4b5c-6d7e-8f9a-0b1c2d3e4f5a", modelId: "hailuo-23-standard-i2v", modelName: "Hailuo 2.3 Standard", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 30, estimatedTimeSeconds: 75, isActive: true, modelFamily: "Hailuo" },
  { recordId: "b4c8d0e2-5f6a-7b8c-9d0e-1f2a3b4c5d6e", modelId: "kling-2-6-i2v", modelName: "Kling 2.6", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 45, estimatedTimeSeconds: 100, isActive: true, modelFamily: "Kling" },
  { recordId: "a3b7c9d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d", modelId: "kling-v25-turbo-pro-i2v", modelName: "Kling V2.5 Turbo Pro", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 35, estimatedTimeSeconds: 80, isActive: true, modelFamily: "Kling" },
  { recordId: "c3397c13-3a52-4973-a87c-b4c20aca0fc0", modelId: "kling-v2-master-i2v", modelName: "Kling V2 Master", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 60, estimatedTimeSeconds: 150, isActive: true, modelFamily: "Kling" },
  { recordId: "84084ca4-4153-46bc-8d01-cd4e37d1da68", modelId: "kling-v2-pro-i2v", modelName: "Kling V2 Pro", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 45, estimatedTimeSeconds: 100, isActive: true, modelFamily: "Kling" },
  { recordId: "88e09730-07e0-4481-bda8-d9d9bde9fec6", modelId: "kling-v2-standard-i2v", modelName: "Kling V2 Standard", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 30, estimatedTimeSeconds: 70, isActive: true, modelFamily: "Kling" },
  { recordId: "e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b", modelId: "midjourney-i2v", modelName: "Midjourney I2V", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 50, estimatedTimeSeconds: 120, isActive: true, modelFamily: "Midjourney" },
  { recordId: "d2c37239-d544-4cce-bd8d-fb48ea44b287", modelId: "runway-i2v", modelName: "Runway", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 50, estimatedTimeSeconds: 120, isActive: true, modelFamily: "Runway" },
  { recordId: "d7df81f6-dc86-4e04-9f75-d4e8c9b03fb2", modelId: "seedance-v1-lite-i2v", modelName: "Seedance V1 Lite", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 20, estimatedTimeSeconds: 50, isActive: true, modelFamily: "Seedance" },
  { recordId: "50eb3f02-1e58-4b85-a535-e8391a5623c4", modelId: "seedream-v1-pro-i2v", modelName: "Seedream V1 Pro", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 40, estimatedTimeSeconds: 90, isActive: true, modelFamily: "Seedream" },
  { recordId: "11a995d9-a89e-47a2-b00c-11b2b7dbb717", modelId: "sora-2-watermarked", modelName: "Sora 2 (Watermarked)", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 20, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Sora" },
  { recordId: "b0c4d5e6-1f2a-3b4c-5d6e-7f8a9b0c1d2e", modelId: "sora-2-i2v", modelName: "Sora 2", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 50, estimatedTimeSeconds: 120, isActive: true, modelFamily: "Sora" },
  { recordId: "c1d5e6f7-2a3b-4c5d-6e7f-8a9b0c1d2e3f", modelId: "sora-2-pro-i2v", modelName: "Sora 2 Pro", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 80, estimatedTimeSeconds: 180, isActive: true, modelFamily: "Sora" },
  { recordId: "e4ae6c36-dfcb-4fe4-94f3-46962df720b1", modelId: "wan-22-turbo-i2v", modelName: "WAN 2.2 Turbo", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 15, estimatedTimeSeconds: 40, isActive: true, modelFamily: "Wan" },
  { recordId: "a6b1c2d3-8e9f-0a1b-2c3d-4e5f6a7b8c9d", modelId: "wan-25-i2v", modelName: "Wan 2.5", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 25, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Wan" },
  { recordId: "b2c3d4e5-6f7a-8b9c-0d1e-f2a3b4c5d6e7", modelId: "seedance-15-pro-i2v", modelName: "Seedance 1.5 Pro", provider: "Kie AI", contentType: "image_to_video", baseCreditCost: 35, estimatedTimeSeconds: 80, isActive: true, modelFamily: "Seedance" },

  // PROMPT TO VIDEO - Active models  
  { recordId: "a96af675-b780-4879-a61f-7285be8766c2", modelId: "google-veo-3-1-fast-t2v", modelName: "Google Veo 3.1 Fast", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 30, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Google Veo" },
  { recordId: "d117daae-f3ec-4b79-b98f-adefeee21454", modelId: "google-veo-3-1-hq-t2v", modelName: "Google Veo 3.1 HQ", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 50, estimatedTimeSeconds: 120, isActive: true, modelFamily: "Google Veo" },
  { recordId: "0643a43b-4995-4c5b-ac1d-76ea257a93a0", modelId: "grok-imagine-t2v", modelName: "Grok Imagine", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 40, estimatedTimeSeconds: 90, isActive: true, modelFamily: "Grok" },
  { recordId: "d7f2a3b4-9c0d-1e2f-3a4b-5c6d7e8f9a0b", modelId: "hailuo-02-pro-t2v", modelName: "Hailuo 02 Pro", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 40, estimatedTimeSeconds: 90, isActive: true, modelFamily: "Hailuo" },
  { recordId: "e8a3b4c5-0d1e-2f3a-4b5c-6d7e8f9a0b1c", modelId: "hailuo-02-standard-t2v", modelName: "Hailuo 02 Standard", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 25, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Hailuo" },
  { recordId: "d6e0f2a4-7b8c-9d0e-1f2a-3b4c5d6e7f8a", modelId: "kling-26-t2v", modelName: "Kling 2.6", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 45, estimatedTimeSeconds: 100, isActive: true, modelFamily: "Kling" },
  { recordId: "c5d9e1f3-6a7b-8c9d-0e1f-2a3b4c5d6e7f", modelId: "kling-v25-turbo-pro-t2v", modelName: "Kling V2.5 Turbo Pro", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 35, estimatedTimeSeconds: 80, isActive: true, modelFamily: "Kling" },
  { recordId: "c5754cad-2b2c-4636-bc19-4ccaa97dde3d", modelId: "kling-v2-master-t2v", modelName: "Kling V2 Master", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 60, estimatedTimeSeconds: 150, isActive: true, modelFamily: "Kling" },
  { recordId: "b6e8c4a3-5d2f-1c7e-8a0f-3d5b6c7e4a8f", modelId: "kling-v2-pro-t2v", modelName: "Kling V2 Pro", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 45, estimatedTimeSeconds: 100, isActive: true, modelFamily: "Kling" },
  { recordId: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b", modelId: "kling-v2-standard-t2v", modelName: "Kling V2 Standard", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 30, estimatedTimeSeconds: 70, isActive: true, modelFamily: "Kling" },
  { recordId: "7bde9fb9-b16b-47b0-86a7-c0762a1a58e3", modelId: "runway-t2v", modelName: "Runway", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 50, estimatedTimeSeconds: 120, isActive: true, modelFamily: "Runway" },
  { recordId: "d9808197-5344-431e-a28e-b84482de076a", modelId: "seedance-v1-lite-t2v", modelName: "Seedance V1 Lite", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 20, estimatedTimeSeconds: 50, isActive: true, modelFamily: "Seedance" },
  { recordId: "b2e60db5-d8b5-4b27-971d-7e195e6ffeda", modelId: "seedream-v1-pro-t2v", modelName: "Seedream V1 Pro", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 40, estimatedTimeSeconds: 90, isActive: true, modelFamily: "Seedream" },
  { recordId: "81a078c7-10fa-450c-92d5-c9f46166be45", modelId: "sora-2-watermarked-t2v", modelName: "Sora 2 (Watermarked)", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 20, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Sora" },
  { recordId: "e7f1a2b3-8c9d-0e1f-2a3b-4c5d6e7f8a9b", modelId: "sora-2-t2v", modelName: "Sora 2", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 50, estimatedTimeSeconds: 120, isActive: true, modelFamily: "Sora" },
  { recordId: "f8a2b3c4-9d0e-1f2a-3b4c-5d6e7f8a9b0c", modelId: "sora-2-pro-t2v", modelName: "Sora 2 Pro", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 80, estimatedTimeSeconds: 180, isActive: true, modelFamily: "Sora" },
  { recordId: "a9b3c4d5-0e1f-2a3b-4c5d-6e7f8a9b0c1d", modelId: "sora-2-pro-storyboard", modelName: "Sora 2 Pro Storyboard", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 100, estimatedTimeSeconds: 240, isActive: true, modelFamily: "Sora" },
  { recordId: "0aaf528a-1334-4121-8467-331c95e8da6d", modelId: "wan-22-turbo-t2v", modelName: "WAN 2.2 Turbo", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 15, estimatedTimeSeconds: 40, isActive: true, modelFamily: "Wan" },
  { recordId: "f5a0b1c2-7d8e-9f0a-1b2c-3d4e5f6a7b8c", modelId: "wan-25-t2v", modelName: "Wan 2.5", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 25, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Wan" },
  { recordId: "a1b2c3d4-5e6f-7a8b-9c0d-e1f2a3b4c5d6", modelId: "seedance-15-pro-t2v", modelName: "Seedance 1.5 Pro", provider: "Kie AI", contentType: "prompt_to_video", baseCreditCost: 35, estimatedTimeSeconds: 80, isActive: true, modelFamily: "Seedance" },

  // LIP SYNC - Active models
  { recordId: "a1b2c3d4-5678-9abc-def0-123456789abc", modelId: "kling-v1-avatar-standard", modelName: "Kling V1 Avatar Standard", provider: "Kie AI", contentType: "lip_sync", baseCreditCost: 20, estimatedTimeSeconds: 45, isActive: true, modelFamily: "Kling Avatar" },
  { recordId: "b2c3d4e5-6789-abcd-ef01-234567890bcd", modelId: "kling-ai-avatar-v1-pro", modelName: "Kling AI Avatar V1 Pro", provider: "Kie AI", contentType: "lip_sync", baseCreditCost: 35, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Kling Avatar" },
  { recordId: "c3d4e5f6-789a-bcde-f012-345678901cde", modelId: "infinitalk", modelName: "Infinitalk", provider: "Kie AI", contentType: "lip_sync", baseCreditCost: 25, estimatedTimeSeconds: 50, isActive: true, modelFamily: "Infinitalk" },
  { recordId: "d4e5f6a7-89ab-cdef-0123-456789012def", modelId: "wan-22-speech-to-video", modelName: "Wan 2.2 Speech-to-Video", provider: "Kie AI", contentType: "lip_sync", baseCreditCost: 20, estimatedTimeSeconds: 45, isActive: true, modelFamily: "Wan" },
  { recordId: "e5f6a7b8-9abc-def0-1234-567890123ef0", modelId: "wan-22-animate-move", modelName: "Wan 2.2 Animate Move", provider: "Kie AI", contentType: "lip_sync", baseCreditCost: 15, estimatedTimeSeconds: 35, isActive: true, modelFamily: "Wan" },
  { recordId: "f6a7b8c9-abcd-ef01-2345-678901234f01", modelId: "wan-22-animate-replace", modelName: "Wan 2.2 Animate Replace", provider: "Kie AI", contentType: "lip_sync", baseCreditCost: 15, estimatedTimeSeconds: 35, isActive: true, modelFamily: "Wan" },

  // VIDEO TO VIDEO - Active models
  { recordId: "a7b8c9d0-bcde-f012-3456-7890123450a2", modelId: "topaz-video-upscale", modelName: "Topaz Video Upscale", provider: "Kie AI", contentType: "video_to_video", baseCreditCost: 20, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Topaz" },
  { recordId: "b8c9d0e1-cdef-0123-4567-8901234560b3", modelId: "wan-26-v2v", modelName: "Wan 2.6 V2V", provider: "Kie AI", contentType: "video_to_video", baseCreditCost: 30, estimatedTimeSeconds: 90, isActive: true, modelFamily: "Wan" },
  { recordId: "c9d0e1f2-def0-1234-5678-9012345670c4", modelId: "kling-26-motion-control", modelName: "Kling 2.6 Motion Control", provider: "Kie AI", contentType: "video_to_video", baseCreditCost: 40, estimatedTimeSeconds: 100, isActive: true, modelFamily: "Kling" },

  // PROMPT TO AUDIO - Active models
  { recordId: "379f8945-bd7f-48f3-a1bb-9d2e2413234c", modelId: "elevenlabs-fast", modelName: "Eleven Labs Fast", provider: "Kie AI", contentType: "prompt_to_audio", baseCreditCost: 5, estimatedTimeSeconds: 10, isActive: true, modelFamily: "ElevenLabs" },
  { recordId: "45fc7e71-0174-48eb-998d-547e8d2476db", modelId: "elevenlabs-tts", modelName: "Eleven Labs TTS", provider: "Kie AI", contentType: "prompt_to_audio", baseCreditCost: 8, estimatedTimeSeconds: 15, isActive: true, modelFamily: "ElevenLabs" },
  { recordId: "5c544c90-9344-4acb-9129-0acb9a6a915a", modelId: "suno", modelName: "Suno", provider: "Kie AI", contentType: "prompt_to_audio", baseCreditCost: 10, estimatedTimeSeconds: 30, isActive: true, modelFamily: "Suno" },
  { recordId: "6a7b8c9d-0e1f-2a3b-4c5d-5e6f7a8b9c0d", modelId: "suno-v4", modelName: "Suno V4", provider: "Kie AI", contentType: "prompt_to_audio", baseCreditCost: 12, estimatedTimeSeconds: 35, isActive: true, modelFamily: "Suno" },
  { recordId: "7b8c9d0e-1f2a-3b4c-5d6e-6f7a8b9c0d1e", modelId: "suno-v4-5", modelName: "Suno V4.5", provider: "Kie AI", contentType: "prompt_to_audio", baseCreditCost: 15, estimatedTimeSeconds: 40, isActive: true, modelFamily: "Suno" },
  { recordId: "8c9d0e1f-2a3b-4c5d-6e7f-7a8b9c0d1e2f", modelId: "suno-v4-5-plus", modelName: "Suno V4.5+", provider: "Kie AI", contentType: "prompt_to_audio", baseCreditCost: 18, estimatedTimeSeconds: 45, isActive: true, modelFamily: "Suno" },
  { recordId: "9d0e1f2a-3b4c-5d6e-7f8a-8b9c0d1e2f3a", modelId: "suno-v4-5-all", modelName: "Suno V4.5ALL", provider: "Kie AI", contentType: "prompt_to_audio", baseCreditCost: 20, estimatedTimeSeconds: 50, isActive: true, modelFamily: "Suno" },
  { recordId: "0e1f2a3b-4c5d-6e7f-8a9b-9c0d1e2f3a4b", modelId: "suno-v5", modelName: "Suno V5", provider: "Kie AI", contentType: "prompt_to_audio", baseCreditCost: 25, estimatedTimeSeconds: 60, isActive: true, modelFamily: "Suno" },
];

interface ContentTypeGroup {
  content_type: string;
  record_id: string;
  title: string;
  description: string;
}

interface ModelPageData {
  slug: string;
  model_name: string;
  provider: string;
  category: string;
  model_record_id: string;
  model_record_ids: string[];
  meta_title: string;
  meta_description: string;
  keywords: string[];
  tagline: string;
  description: string;
  pricing_note: string;
  highlights: object[];
  specifications: object;
  use_cases: object[];
  faqs: object[];
  content_type_groups: ContentTypeGroup[];
  is_published: boolean;
  is_featured: boolean;
  display_order: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for admin authorization (optional - can be removed for one-time seed)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Parse request body for options
    let options = { dryRun: false, deleteExisting: false };
    try {
      const body = await req.json();
      options = { ...options, ...body };
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log(`Seeding model pages with options:`, options);

    // Filter to only active models
    const activeModels = MODEL_DATA.filter(m => m.isActive);
    console.log(`Found ${activeModels.length} active models`);

    // Group models by modelFamily (consolidate variants onto single pages)
    const modelFamilies = new Map<string, ModelConfig[]>();
    for (const model of activeModels) {
      const familyKey = model.modelFamily || model.modelName;
      if (!modelFamilies.has(familyKey)) {
        modelFamilies.set(familyKey, []);
      }
      modelFamilies.get(familyKey)!.push(model);
    }

    console.log(`Grouped into ${modelFamilies.size} model families`);

    // Generate model page data for each family
    const modelPages: ModelPageData[] = [];
    let displayOrder = 0;

    for (const [familyName, familyModels] of modelFamilies) {
      // Use the first model as the "primary" for the page
      const primaryModel = familyModels[0];
      const displayProvider = getDisplayProvider(primaryModel.provider);
      const slug = generateSlug(familyName);
      
      // Collect all content types for this family
      const contentTypeGroups: ContentTypeGroup[] = familyModels.map(m => ({
        content_type: m.contentType,
        record_id: m.recordId,
        title: formatContentType(m.contentType),
        description: `Generate ${formatContentType(m.contentType).toLowerCase()} with ${familyName}`
      }));

      // Deduplicate content types (some families have same content type from different variants)
      const uniqueContentTypes = new Map<string, ContentTypeGroup>();
      for (const group of contentTypeGroups) {
        if (!uniqueContentTypes.has(group.content_type)) {
          uniqueContentTypes.set(group.content_type, group);
        }
      }

      const primaryCategory = contentTypeToCategory(primaryModel.contentType);
      const avgCost = Math.round(familyModels.reduce((sum, m) => sum + m.baseCreditCost, 0) / familyModels.length);
      
      // Generate keywords including all content types
      const keywords = [
        familyName,
        displayProvider,
        primaryCategory,
        "AI",
        "generation",
        "ARTIFIO",
        ...Array.from(uniqueContentTypes.keys()).map(ct => formatContentType(ct)),
      ];

      const modelPage: ModelPageData = {
        slug,
        model_name: familyName,
        provider: displayProvider,
        category: primaryCategory,
        model_record_id: primaryModel.recordId,
        model_record_ids: familyModels.map(m => m.recordId),
        meta_title: `${familyName} AI | ${primaryCategory} | ARTIFIO.ai`,
        meta_description: `Create stunning ${primaryCategory.toLowerCase()} with ${familyName} by ${displayProvider}. Professional AI generation starting at ${avgCost} credits. Try free on ARTIFIO.`,
        keywords,
        tagline: `${displayProvider}'s powerful ${primaryCategory.toLowerCase()} model`,
        description: `${familyName} is a cutting-edge AI model for ${primaryCategory.toLowerCase()}. With support for ${Array.from(uniqueContentTypes.values()).map(g => g.title).join(', ')}, it delivers professional-quality results for marketing, social media, creative projects, and more. Available exclusively on ARTIFIO.ai.`,
        pricing_note: `Starting at ${avgCost} credits per generation`,
        highlights: generateHighlights(primaryModel.contentType, familyName),
        specifications: {
          "Provider": displayProvider,
          "Base Cost": `${avgCost} credits`,
          "Content Types": Array.from(uniqueContentTypes.values()).map(g => g.title).join(', '),
          "Estimated Time": `${primaryModel.estimatedTimeSeconds}+ seconds`,
        },
        use_cases: generateUseCases(primaryModel.contentType),
        faqs: generateFAQs(familyName, displayProvider, avgCost, primaryModel.contentType),
        content_type_groups: Array.from(uniqueContentTypes.values()),
        is_published: true,
        is_featured: familyName.includes('FLUX') || familyName.includes('Midjourney') || familyName.includes('Sora') || familyName.includes('Kling'),
        display_order: displayOrder++,
      };

      modelPages.push(modelPage);
    }

    console.log(`Generated ${modelPages.length} model page records`);

    if (options.dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          totalPages: modelPages.length,
          pages: modelPages.map(p => ({
            slug: p.slug,
            model_name: p.model_name,
            provider: p.provider,
            category: p.category,
            content_types: p.content_type_groups.map(g => g.content_type),
            is_featured: p.is_featured,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing pages if requested
    if (options.deleteExisting) {
      const { error: deleteError } = await supabase
        .from('model_pages')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) {
        console.error('Error deleting existing pages:', deleteError);
      } else {
        console.log('Deleted existing model pages');
      }
    }

    // Insert new model pages
    const results = { inserted: 0, updated: 0, errors: [] as string[] };

    for (const page of modelPages) {
      // Check if page already exists by slug
      const { data: existing } = await supabase
        .from('model_pages')
        .select('id')
        .eq('slug', page.slug)
        .single();

      if (existing) {
        // Update existing page
        const { error: updateError } = await supabase
          .from('model_pages')
          .update(page)
          .eq('id', existing.id);

        if (updateError) {
          results.errors.push(`Failed to update ${page.slug}: ${updateError.message}`);
        } else {
          results.updated++;
        }
      } else {
        // Insert new page
        const { error: insertError } = await supabase
          .from('model_pages')
          .insert(page);

        if (insertError) {
          results.errors.push(`Failed to insert ${page.slug}: ${insertError.message}`);
        } else {
          results.inserted++;
        }
      }
    }

    console.log(`Seed complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        totalPages: modelPages.length,
        inserted: results.inserted,
        updated: results.updated,
        errors: results.errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error seeding model pages:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
