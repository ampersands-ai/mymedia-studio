/**
 * Deno-Compatible Model Registry for Edge Functions
 * ADR 007: Direct Model Execution via Model Registry
 *
 * This registry provides the same interface as the frontend registry
 * but uses Deno-compatible imports with .ts extensions.
 *
 * The models/ directory is a symlink to src/lib/models/locked/
 * so both frontend and edge functions use the EXACT SAME model files.
 */

import type { ModelModule } from './types.ts';

/**
 * Helper function: Convert contentType to database generation type
 */
export function getGenerationType(contentType: string): 'image' | 'video' | 'audio' | 'text' {
  const typeMap: Record<string, 'image' | 'video' | 'audio' | 'text'> = {
    'prompt_to_image': 'image',
    'image_editing': 'image',
    'image_to_video': 'video',
    'prompt_to_video': 'video',
    'prompt_to_audio': 'audio',
  };

  const type = typeMap[contentType];

  if (!type) {
    // Unknown contentType, defaulting to 'text'
    return 'text';
  }

  return type;
}

// Dynamic imports for better performance
// Only load models when needed

/**
 * Primary Registry: Maps record_id → model module path
 * This approach uses lazy loading - models are imported only when requested
 *
 * Total: 71 models across 5 categories
 * - Prompt to Audio: 3 models
 * - Image Editing: 15 models
 * - Prompt to Image: 28 models
 * - Image to Video: 13 models
 * - Prompt to Video: 12 models
 */
const MODEL_PATHS: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT TO AUDIO MODELS (3 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "379f8945-bd7f-48f3-a1bb-9d2e2413234c": "./models/prompt_to_audio/ElevenLabs_Fast.ts",
  "45fc7e71-0174-48eb-998d-547e8d2476db": "./models/prompt_to_audio/ElevenLabs_TTS.ts",
  "5c544c90-9344-4acb-9129-0acb9a6a915a": "./models/prompt_to_audio/Suno.ts",

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE EDITING MODELS (15 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "4b68811b-28be-45cb-bcae-9db721ba4547": "./models/image_editing/ChatGPT_4o_Image.ts",
  "00ef3f28-4fab-4244-b93f-0ba48641fcbd": "./models/image_editing/Recraft_Crisp_Upscale.ts",
  "ab0ae096-f0ef-4197-b186-f38d69e72dd3": "./models/image_editing/FLUX_1_Kontext_Max.ts",
  "d0ef1f83-a613-47d4-82f8-10e41da3e2a0": "./models/image_editing/FLUX_1_Kontext_Pro.ts",
  "2959b083-2177-4b8c-ae56-31170c2eb9dc": "./models/image_editing/Google_Image_Upscale.ts",
  "4a421ed9-ed0c-40bf-b06d-892871506124": "./models/image_editing/Ideogram_Character.ts",
  "922ca567-5aa1-4fd3-86ba-587b723a5dbf": "./models/image_editing/Ideogram_Image_Remix.ts",
  "2c4802d0-f805-4c31-bab1-a07675e003eb": "./models/image_editing/Ideogram_V3_Reframe.ts",
  "a70d01a3-05de-4918-b934-55a7e5e5d407": "./models/image_editing/Nano_Banana_by_Google_edit.ts",
  "b6d430f1-e823-4192-bf72-0dba29079931": "./models/image_editing/Qwen_Image_Editor.ts",
  "99532b69-d951-4431-87e3-1d88a9c8ee73": "./models/image_editing/Qwen_Image_to_Image.ts",
  "58b8b09f-57fd-42e3-ae2d-689e9ea3064d": "./models/image_editing/Remove_Background_kie_ai.ts",
  "d1d8b152-e123-4375-8f55-c0d0a699009b": "./models/image_editing/Remove_Background_runware.ts",
  "dcd3329b-fafa-4689-b2e4-a08f7832c7ac": "./models/image_editing/Seedream_V4.ts",
  "f14e7b76-98a8-47c7-a0bc-e58dc9ba811c": "./models/image_editing/runware_upscale.ts",

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT TO IMAGE MODELS (28 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "3b83cee8-6164-4d98-aebe-f4eadcb3da1d": "./models/prompt_to_image/ChatGPT_4o_Image.ts",
  "f311e8bd-d7a8-4f81-b186-3ac6a5aefe8c": "./models/prompt_to_image/Flux_1_Dev.ts",
  "100@1": "./models/prompt_to_image/FLUX_1_Pro.ts",
  "c1bd50df-1c27-48a3-8630-0970eedd21f6": "./models/prompt_to_image/FLUX_1_Kontext_Max_prompt.ts",
  "94b43382-bf4b-490d-82b5-265d14473f9b": "./models/prompt_to_image/FLUX_1_Kontext_Pro_prompt.ts",
  "schnell": "./models/prompt_to_image/FLUX_1_Schnell.ts",
  "32e98d54-3e47-41f8-ae70-0b0c18b78b8f": "./models/prompt_to_image/runware_flux_1_schnell.ts",
  "5290ad50-ebeb-4fc0-97fb-bff7db6784b5": "./models/prompt_to_image/Google_Imagen_4.ts",
  "0ff9bb96-041e-4c24-90c5-543064b642ca": "./models/prompt_to_image/Google_Imagen_4_Fast.ts",
  "23e81043-5e53-400b-bc1a-2a1ed9f30ce0": "./models/prompt_to_image/Google_Imagen_4_Ultra.ts",
  "49a79e90-830d-40ff-ad05-447cf0232592": "./models/prompt_to_image/Grok_Imagine.ts",
  "79ce627d-f90c-47b2-ae3f-9437d93f4529": "./models/prompt_to_image/HiDream_Dev.ts",
  "7fe80ee8-701c-49b9-a21e-79f8c82489c8": "./models/prompt_to_image/HiDream_Fast.ts",
  "a8f5c3e9-7d4b-6f2c-9a1e-5d8b3c7f4a6e": "./models/prompt_to_image/Ideogram_Character.ts",
  "f9c5e7a3-8d4b-6f2c-9a1e-5d7b3c8f4a6e": "./models/prompt_to_image/Ideogram_V2_Plus.ts",
  "94c0e508-226a-4e3d-8229-3820a61faa88": "./models/prompt_to_image/Ideogram_V3.ts",
  "d8c5a7f3-9b4e-6f2c-8a1d-5e7b3c9f4a6e": "./models/prompt_to_image/Jasper_Text_to_Image.ts",
  "eff6c62e-c20e-4eed-9f5b-81e1a7f01529": "./models/prompt_to_image/Midjourney.ts",
  "4c680009-d3fe-436f-85a7-467c76e85f9e": "./models/prompt_to_image/Nano_Banana_Lovable_AI.ts",
  "09b03fa3-e648-4d42-8494-b91bd2e609b8": "./models/prompt_to_image/Nano_Banana_by_Google.ts",
  "36246bd4-f2e5-472b-bcf8-3dd99bc313d8": "./models/prompt_to_image/Qwen_QwenVL.ts",
  "edc7a24b-b9da-46a7-8155-635626c0f9a3": "./models/prompt_to_image/runware_flux_1_1_pro.ts",
  "c8f9b5e2-7d4a-6f3b-9e1c-5a8d3f7b4e9a": "./models/prompt_to_image/runware_stable_diffusion_v3.ts",
  "b7f8c5e2-6d4a-5f3b-8e1c-4a7d2f6b3e9a": "./models/prompt_to_image/runware_stable_diffusion_xl.ts",
  "ac90c626-ab01-4bc0-a000-9b952ddbde0e": "./models/prompt_to_image/Seedream_V3.ts",
  "c0e4f338-683a-4b5d-8289-518f2b5ea983": "./models/prompt_to_image/Seedream_V4.ts",
  "f8c5a7e9-9d4b-6f2c-8a1e-5d7b3c9f4a6e": "./models/prompt_to_image/Ultra_Detail_V0.ts",

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE TO VIDEO MODELS (13 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "8aac94cb-5625-47f4-880c-4f0fd8bd83a1": "./models/image_to_video/Google_Veo_3_1_Fast.ts",
  "a5c2ec16-6294-4588-86b6-7b4182601cda": "./models/image_to_video/Google_Veo_3_1_HQ.ts",
  "6e8a863e-8630-4eef-bdbb-5b41f4c883f9": "./models/image_to_video/Google_Veo_3_1_Reference.ts",
  "8c46aade-1272-4409-bb3a-3701e2423320": "./models/image_to_video/Grok_Imagine.ts",
  "c3397c13-3a52-4973-a87c-b4c20aca0fc0": "./models/image_to_video/Kling_V2_Master.ts",
  "84084ca4-4153-46bc-8d01-cd4e37d1da68": "./models/image_to_video/Kling_V2_Pro.ts",
  "88e09730-07e0-4481-bda8-d9d9bde9fec6": "./models/image_to_video/Kling_V2_Standard.ts",
  "d2c37239-d544-4cce-bd8d-fb48ea44b287": "./models/image_to_video/Runway.ts",
  "d7df81f6-dc86-4e04-9f75-d4e8c9b03fb2": "./models/image_to_video/Seedance_V1_Lite.ts",
  "3ac57af3-f7f0-4205-b1a4-3c7c3c1c7dad": "./models/image_to_video/Seedance_V1_0_Pro_Fast_runware.ts",
  "50eb3f02-1e58-4b85-a535-e8391a5623c4": "./models/image_to_video/Seedream_V1_Pro.ts",
  "11a995d9-a89e-47a2-b00c-11b2b7dbb717": "./models/image_to_video/Sora_2_by_OpenAI_Watermarked.ts",
  "e4ae6c36-dfcb-4fe4-94f3-46962df720b1": "./models/image_to_video/WAN_2_2_Turbo.ts",

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT TO VIDEO MODELS (12 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "a96af675-b780-4879-a61f-7285be8766c2": "./models/prompt_to_video/Google_Veo_3_1_Fast.ts",
  "d117daae-f3ec-4b79-b98f-adefeee21454": "./models/prompt_to_video/Google_Veo_3_1_HQ.ts",
  "0643a43b-4995-4c5b-ac1d-76ea257a93a0": "./models/prompt_to_video/Grok_Imagine.ts",
  "c5754cad-2b2c-4636-bc19-4ccaa97dde3d": "./models/prompt_to_video/Kling_V2_Master.ts",
  "b6e8c4a3-5d2f-1c7e-8a0f-3d5b6c7e4a8f": "./models/prompt_to_video/Kling_V2_Pro.ts",
  "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b": "./models/prompt_to_video/Kling_V2_Standard.ts",
  "7bde9fb9-b16b-47b0-86a7-c0762a1a58e3": "./models/prompt_to_video/Runway.ts",
  "d9808197-5344-431e-a28e-b84482de076a": "./models/prompt_to_video/Seedance_V1_Lite.ts",
  "734c7712-aae3-4ad2-93b9-df198623503d": "./models/prompt_to_video/Seedance_V1_0_Pro_Fast_runware.ts",
  "b2e60db5-d8b5-4b27-971d-7e195e6ffeda": "./models/prompt_to_video/Seedream_V1_Pro.ts",
  "81a078c7-10fa-450c-92d5-c9f46166be45": "./models/prompt_to_video/Sora_2_by_OpenAI_Watermarked.ts",
  "0aaf528a-1334-4121-8467-331c95e8da6d": "./models/prompt_to_video/WAN_2_2_Turbo.ts",
};

/**
 * Module-level cache to avoid re-importing
 */
const moduleCache = new Map<string, ModelModule>();

/**
 * Get a model by its record ID
 * Returns the model module with execute(), validate(), etc.
 */
export async function getModel(recordId: string): Promise<ModelModule> {
  // Check cache first
  if (moduleCache.has(recordId)) {
    return moduleCache.get(recordId)!;
  }

  // Get model path
  const modelPath = MODEL_PATHS[recordId];
  if (!modelPath) {
    throw new Error(`Model not found for record_id: ${recordId}`);
  }

  // Dynamic import (Deno-compatible)
  const module = await import(modelPath);
  const modelModule = module as ModelModule;

  // Cache for future use
  moduleCache.set(recordId, modelModule);

  return modelModule;
}

/**
 * Get model config without full module import
 * Useful for metadata lookups
 */
export async function getModelConfig(recordId: string) {
  const model = await getModel(recordId);
  return model.MODEL_CONFIG;
}

/**
 * Get all available model record IDs
 */
export function getAvailableModelRecordIds(): string[] {
  return Object.keys(MODEL_PATHS);
}

/**
 * Check if a model exists
 */
export function modelExists(recordId: string): boolean {
  return MODEL_PATHS.hasOwnProperty(recordId);
}

/**
 * Clear the module cache (useful for testing)
 */
export function clearCache(): void {
  moduleCache.clear();
}

/**
 * Get all models (expensive - loads all modules)
 * Use sparingly!
 */
export async function getAllModels(): Promise<ModelModule[]> {
  const recordIds = getAvailableModelRecordIds();
  const models = await Promise.all(
    recordIds.map(id => getModel(id))
  );
  return models;
}

/**
 * Get models by content type
 */
export async function getModelsByContentType(contentType: string): Promise<ModelModule[]> {
  const allModels = await getAllModels();
  return allModels.filter(m => m.MODEL_CONFIG.contentType === contentType);
}

/**
 * Get models by provider
 */
export async function getModelsByProvider(provider: string): Promise<ModelModule[]> {
  const allModels = await getAllModels();
  return allModels.filter(m => m.MODEL_CONFIG.provider === provider);
}
