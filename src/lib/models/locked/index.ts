/**
 * Model Registry - Central index of all isolated model files
 * Each model is completely independent with zero shared logic
 *
 * IMPORTANT: Runware API Requirements
 * ------------------------------------
 * ALL Runware models REQUIRE an array payload format:
 * [
 *   { taskType: "authentication", apiKey: "..." },
 *   { taskUUID: "...", taskType: "...", ...params }
 * ]
 *
 * This requirement takes precedence over the model's payload_structure setting.
 * The execute-custom-model edge function checks provider === 'runware' FIRST
 * before checking payload_structure to ensure proper array formatting.
 */

import { logger } from "@/lib/logger";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";

/**
 * Helper function: Convert contentType to database generation type
 * Database expects: 'image' | 'video' | 'audio' | 'text'
 * ContentType values: 'prompt_to_image' | 'image_editing' | 'prompt_to_video' | etc.
 *
 * EXPLICIT MAPPING - No inference logic
 */
export function getGenerationType(contentType: string): 'image' | 'video' | 'audio' | 'text' {
  const typeMap: Record<string, 'image' | 'video' | 'audio' | 'text'> = {
    'prompt_to_image': 'image',
    'image_editing': 'image',
    'image_to_video': 'video',
    'prompt_to_video': 'video',
    'lip_sync': 'video',
    'video_to_video': 'video',
    'prompt_to_audio': 'audio',
  };

  const type = typeMap[contentType];

  if (!type) {
    logger.warn(`Unknown contentType: "${contentType}", defaulting to 'text'`, { contentType });
    return 'text';
  }

  return type;
}

// Image Editing Models (20)
import * as ChatGPT4oImage_ImageEditing from "./image_editing/ChatGPT_4o_Image";
import * as RecraftCrispUpscale from "./image_editing/Recraft_Crisp_Upscale";
import * as FLUX1KontextMax_ImageEditing from "./image_editing/FLUX_1_Kontext_Max";
import * as FLUX1KontextPro_ImageEditing from "./image_editing/FLUX_1_Kontext_Pro";
import * as FLUX2FlexImageToImage from "./image_editing/FLUX_2_Flex_Image_to_Image";
import * as FLUX2ProImageToImage from "./image_editing/FLUX_2_Pro_Image_to_Image";
import * as GoogleImageUpscale from "./image_editing/Google_Image_Upscale";
import * as IdeogramCharacter_ImageEditing from "./image_editing/Ideogram_Character";
import * as IdeogramImageRemix from "./image_editing/Ideogram_Image_Remix";
import * as IdeogramV3Reframe from "./image_editing/Ideogram_V3_Reframe";
import * as MidjourneyI2I from "./image_editing/Midjourney_I2I";
import * as NanoBananaEdit from "./image_editing/Nano_Banana_by_Google_edit";
import * as NanoBananaProEditing from "./image_editing/Nano_Banana_Pro";
import * as QwenImageEditor from "./image_editing/Qwen_Image_Editor";
import * as QwenImageToImage from "./image_editing/Qwen_Image_to_Image";
import * as RemoveBackgroundKie from "./image_editing/Remove_Background_kie_ai";
import * as RemoveBackgroundRunware from "./image_editing/Remove_Background_runware";
import * as Seedream45 from "./image_editing/Seedream_4_5";
import * as SeedreamV4_ImageEditing from "./image_editing/Seedream_V4";
import * as RunwareUpscale from "./image_editing/runware_upscale";

// Image to Video Models (24)
import * as GoogleVeo31Fast_ImageToVideo from "./image_to_video/Google_Veo_3_1_Fast";
import * as GoogleVeo31HQ_ImageToVideo from "./image_to_video/Google_Veo_3_1_HQ";
import * as GoogleVeo31Reference from "./image_to_video/Google_Veo_3_1_Reference";
import * as GrokImagine_ImageToVideo from "./image_to_video/Grok_Imagine";
import * as Hailuo02Pro_ImageToVideo from "./image_to_video/Hailuo_02_Pro_I2V";
import * as Hailuo02Standard_ImageToVideo from "./image_to_video/Hailuo_02_Standard_I2V";
import * as Hailuo23Pro_ImageToVideo from "./image_to_video/Hailuo_2_3_Pro_I2V";
import * as Hailuo23Standard_ImageToVideo from "./image_to_video/Hailuo_2_3_Standard_I2V";
import * as Kling26_ImageToVideo from "./image_to_video/Kling_2_6_I2V";
import * as KlingV25TurboPro_ImageToVideo from "./image_to_video/Kling_V2_5_Turbo_Pro_I2V";
import * as KlingV2Master_ImageToVideo from "./image_to_video/Kling_V2_Master";
import * as KlingV2Pro_ImageToVideo from "./image_to_video/Kling_V2_Pro";
import * as KlingV2Standard_ImageToVideo from "./image_to_video/Kling_V2_Standard";
import * as MidjourneyI2V from "./image_to_video/Midjourney_I2V";
import * as Runway_ImageToVideo from "./image_to_video/Runway";
import * as SeedanceV1Lite_ImageToVideo from "./image_to_video/Seedance_V1_Lite";
import * as SeedreamV1Pro_ImageToVideo from "./image_to_video/Seedream_V1_Pro";
import * as Sora2OpenAI from "./image_to_video/Sora_2_by_OpenAI_Watermarked";
import * as Sora2_ImageToVideo from "./image_to_video/Sora_2_I2V";
import * as Sora2Pro_ImageToVideo from "./image_to_video/Sora_2_Pro_I2V";
import * as WAN22Turbo_ImageToVideo from "./image_to_video/WAN_2_2_Turbo";
import * as Wan22TurboNew_ImageToVideo from "./image_to_video/Wan_2_2_Turbo_I2V";
import * as Wan25_ImageToVideo from "./image_to_video/Wan_2_5_I2V";
import * as SeedanceV1ProFastRunware from "./image_to_video/Seedance_V1_0_Pro_Fast_runware";
import * as Wan26_ImageToVideo from "./image_to_video/Wan_2_6_I2V";

// Video to Video Models (2)
import * as TopazVideoUpscale from "./video_to_video/Topaz_Video_Upscale";
import * as Wan26_VideoToVideo from "./video_to_video/Wan_2_6_V2V";
// Prompt to Audio Models (8)
import * as ElevenLabsFast from "./prompt_to_audio/ElevenLabs_Fast";
import * as ElevenLabsTTS from "./prompt_to_audio/ElevenLabs_TTS";
import * as Suno from "./prompt_to_audio/Suno";
import * as SunoV4 from "./prompt_to_audio/Suno_V4";
import * as SunoV4_5 from "./prompt_to_audio/Suno_V4_5";
import * as SunoV4_5_Plus from "./prompt_to_audio/Suno_V4_5_Plus";
import * as SunoV4_5_All from "./prompt_to_audio/Suno_V4_5_All";
import * as SunoV5 from "./prompt_to_audio/Suno_V5";

// Prompt to Image Models (32)
import * as ChatGPT4oImage_PromptToImage from "./prompt_to_image/ChatGPT_4o_Image";
import * as FLUX2ProTextToImage from "./prompt_to_image/FLUX_2_Pro_Text_to_Image";
import * as FLUX2FlexTextToImage from "./prompt_to_image/FLUX_2_Flex_Text_to_Image";
import * as ZImage from "./prompt_to_image/Z_Image";
import * as Flux1Dev from "./prompt_to_image/Flux_1_Dev";
import * as FLUX1KontextMax_PromptToImage from "./prompt_to_image/FLUX_1_Kontext_Max_prompt";
import * as FLUX1KontextPro_PromptToImage from "./prompt_to_image/FLUX_1_Kontext_Pro_prompt";
import * as FLUX1Pro from "./prompt_to_image/FLUX_1_Pro";
import * as FLUX1Schnell from "./prompt_to_image/FLUX_1_Schnell";
import * as GoogleImagen4 from "./prompt_to_image/Google_Imagen_4";
import * as GoogleImagen4Fast from "./prompt_to_image/Google_Imagen_4_Fast";
import * as GoogleImagen4Ultra from "./prompt_to_image/Google_Imagen_4_Ultra";
import * as GrokImagine_PromptToImage from "./prompt_to_image/Grok_Imagine";
import * as HiDreamDev from "./prompt_to_image/HiDream_Dev";
import * as HiDreamFast from "./prompt_to_image/HiDream_Fast";
import * as IdeogramCharacter_PromptToImage from "./prompt_to_image/Ideogram_Character";
import * as IdeogramV2Plus from "./prompt_to_image/Ideogram_V2_Plus";
import * as IdeogramV3 from "./prompt_to_image/Ideogram_V3";
import * as JasperTextToImage from "./prompt_to_image/Jasper_Text_to_Image";
import * as Midjourney from "./prompt_to_image/Midjourney";
import * as NanoBananaLovableAI from "./prompt_to_image/Nano_Banana_Lovable_AI";
import * as NanoBananaByGoogle from "./prompt_to_image/Nano_Banana_by_Google";
import * as NanoBananaProGeneration from "./prompt_to_image/Nano_Banana_Pro";
import * as QwenQwenVL from "./prompt_to_image/Qwen_QwenVL";
import * as SeedreamV3 from "./prompt_to_image/Seedream_V3";
import * as SeedreamV4_PromptToImage from "./prompt_to_image/Seedream_V4";
import * as SeedreamV45_PromptToImage from "./prompt_to_image/Seedream_V4_5";
import * as UltraDetailV0 from "./prompt_to_image/Ultra_Detail_V0";
import * as RunwareFlux11Pro from "./prompt_to_image/runware_flux_1_1_pro";
import * as RunwareFlux1Schnell from "./prompt_to_image/runware_flux_1_schnell";
import * as RunwareStableDiffusionV3 from "./prompt_to_image/runware_stable_diffusion_v3";
import * as RunwareStableDiffusionXL from "./prompt_to_image/runware_stable_diffusion_xl";

// Prompt to Video Models (21)
import * as GoogleVeo31Fast_PromptToVideo from "./prompt_to_video/Google_Veo_3_1_Fast";

// Lip Sync Models (4)
import * as KlingV1AvatarStandard_LipSync from "./lip_sync/Kling_V1_Avatar_Standard";
import * as KlingAIAvatarV1Pro_LipSync from "./lip_sync/Kling_AI_Avatar_V1_Pro";
import * as Infinitalk_LipSync from "./lip_sync/Infinitalk_from_audio";
import * as Wan22SpeechToVideo_LipSync from "./lip_sync/Wan_2_2_Speech_to_Video";
import * as GoogleVeo31HQ_PromptToVideo from "./prompt_to_video/Google_Veo_3_1_HQ";
import * as GrokImagine_PromptToVideo from "./prompt_to_video/Grok_Imagine";
import * as Hailuo02Pro_PromptToVideo from "./prompt_to_video/Hailuo_02_Pro_T2V";
import * as Hailuo02Standard_PromptToVideo from "./prompt_to_video/Hailuo_02_Standard_T2V";
import * as Kling26_PromptToVideo from "./prompt_to_video/Kling_2_6_T2V";
import * as KlingV25TurboPro_PromptToVideo from "./prompt_to_video/Kling_V2_5_Turbo_Pro_T2V";
import * as KlingV2Master_PromptToVideo from "./prompt_to_video/Kling_V2_Master";
import * as KlingV2Pro_PromptToVideo from "./prompt_to_video/Kling_V2_Pro";
import * as KlingV2Standard_PromptToVideo from "./prompt_to_video/Kling_V2_Standard";
import * as Runway_PromptToVideo from "./prompt_to_video/Runway";
import * as SeedanceV1Lite_PromptToVideo from "./prompt_to_video/Seedance_V1_Lite";
import * as SeedanceV1ProFastRunware_PromptToVideo from "./prompt_to_video/Seedance_V1_0_Pro_Fast_runware";
import * as SeedreamV1Pro_PromptToVideo from "./prompt_to_video/Seedream_V1_Pro";
import * as Sora2OpenAI_PromptToVideo from "./prompt_to_video/Sora_2_by_OpenAI_Watermarked";
import * as Sora2_PromptToVideo from "./prompt_to_video/Sora_2_T2V";
import * as Sora2Pro_PromptToVideo from "./prompt_to_video/Sora_2_Pro_T2V";
import * as Sora2ProStoryboard_PromptToVideo from "./prompt_to_video/Sora_2_Pro_Storyboard";
import * as WAN22Turbo_PromptToVideo from "./prompt_to_video/WAN_2_2_Turbo";
import * as Wan22TurboNew_PromptToVideo from "./prompt_to_video/Wan_2_2_Turbo_T2V";
import * as Wan25_PromptToVideo from "./prompt_to_video/Wan_2_5_T2V";
import * as Wan26_PromptToVideo from "./prompt_to_video/Wan_2_6_T2V";

/**
 * Generation execution parameters
 * Re-exported from executeGeneration.ts for consistency
 * Note: The actual ExecuteGenerationParams is defined in @/lib/generation/executeGeneration
 */

/**
 * Validation result from model validation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Cost multiplier configuration
 */
export type CostMultipliers = Record<string, number | Record<string, number>> | null;

/**
 * JSON Schema for model input parameters (flexible for compatibility)
 */
export interface ModelJsonSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[] | readonly string[];
  [key: string]: unknown;
}

/**
 * Complete model module interface with explicit types
 */
export interface ModelModule {
  MODEL_CONFIG: {
    // Core model identification
    modelId: string;
    recordId: string;
    modelName: string;
    provider: string;
    contentType: string;

    // Cost and performance
    baseCreditCost: number;
    estimatedTimeSeconds: number;
    costMultipliers: CostMultipliers;
    defaultOutputs: number;

    // API configuration
    apiEndpoint: string | null;
    payloadStructure: string;
    maxImages: number | null;

    // UI metadata
    isActive: boolean;
    logoUrl?: string | null;
    modelFamily?: string | null;
    variantName?: string | null;
    displayOrderInFamily?: number;
    showNotifyOnCompletion?: boolean; // Defaults to true if not specified

    // Lock system
    isLocked: boolean;
    lockedFilePath: string;
  };
  SCHEMA: ModelJsonSchema;
  validate: (inputs: Record<string, unknown>) => ValidationResult;
  preparePayload: (inputs: Record<string, unknown>) => Record<string, unknown> | unknown[];
  calculateCost: (inputs: Record<string, unknown>, audioDurationSeconds?: number) => number;
  execute: (params: ExecuteGenerationParams) => Promise<string>;
}

/**
 * Registry mapping model IDs to their modules (fallback lookup)
 * Note: Some models share the same model_id but differ by record_id
 * Primary lookup should always use RECORD_ID_REGISTRY
 */
export const MODEL_REGISTRY: Record<string, ModelModule> = {
  // Image Editing
  "4o-image-api": ChatGPT4oImage_ImageEditing as ModelModule,
  "recraft/crisp-upscale": RecraftCrispUpscale as ModelModule,
  
  // Prompt to Audio
  "elevenlabs/text-to-speech-turbo-2-5": ElevenLabsFast as ModelModule,
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRIMARY REGISTRY: RECORD_ID_REGISTRY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Maps unique record_ids to their model modules.
 * This is the PRIMARY and PREFERRED lookup method since record_id is unique.
 * 
 * Total: 103 models across 7 groups
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const RECORD_ID_REGISTRY: Record<string, ModelModule> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT TO AUDIO MODELS (8 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "379f8945-bd7f-48f3-a1bb-9d2e2413234c": ElevenLabsFast as ModelModule,                    // Eleven Labs Fast
  "45fc7e71-0174-48eb-998d-547e8d2476db": ElevenLabsTTS as ModelModule,                     // Eleven Labs TTS
  "5c544c90-9344-4acb-9129-0acb9a6a915a": Suno as ModelModule,                              // Suno
  "6a7b8c9d-0e1f-2a3b-4c5d-5e6f7a8b9c0d": SunoV4 as ModelModule,                            // Suno V4
  "7b8c9d0e-1f2a-3b4c-5d6e-6f7a8b9c0d1e": SunoV4_5 as ModelModule,                          // Suno V4.5
  "8c9d0e1f-2a3b-4c5d-6e7f-7a8b9c0d1e2f": SunoV4_5_Plus as ModelModule,                     // Suno V4.5+
  "9d0e1f2a-3b4c-5d6e-7f8a-8b9c0d1e2f3a": SunoV4_5_All as ModelModule,                      // Suno V4.5ALL
  "0e1f2a3b-4c5d-6e7f-8a9b-9c0d1e2f3a4b": SunoV5 as ModelModule,                            // Suno V5

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE EDITING MODELS (20 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "4b68811b-28be-45cb-bcae-9db721ba4547": ChatGPT4oImage_ImageEditing as ModelModule,      // ChatGPT 4o Image | image_editing | kie_ai
  "00ef3f28-4fab-4244-b93f-0ba48641fcbd": RecraftCrispUpscale as ModelModule,               // Crisp Image Upscale | image_editing | kie_ai
  "ab0ae096-f0ef-4197-b186-f38d69e72dd3": FLUX1KontextMax_ImageEditing as ModelModule,      // FLUX.1 Kontext Max | image_editing | kie_ai
  "d0ef1f83-a613-47d4-82f8-10e41da3e2a0": FLUX1KontextPro_ImageEditing as ModelModule,      // FLUX.1 Kontext Pro | image_editing | kie_ai
  "e1f2a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b": FLUX2FlexImageToImage as ModelModule,             // FLUX 2 Flex Image-to-Image | image_editing | kie_ai
  "f2e3d4c5-6b7a-8f9e-0d1c-2b3a4e5f6d7c": FLUX2ProImageToImage as ModelModule,              // FLUX 2 Pro Image-to-Image | image_editing | kie_ai
  "2959b083-2177-4b8c-ae56-31170c2eb9dc": GoogleImageUpscale as ModelModule,                 // Google Image Upscale | image_editing | kie_ai
  "4a421ed9-ed0c-40bf-b06d-892871506124": IdeogramCharacter_ImageEditing as ModelModule,    // Ideogram Character | image_editing | kie_ai
  "922ca567-5aa1-4fd3-86ba-587b723a5dbf": IdeogramImageRemix as ModelModule,                // Ideogram Image Remix | image_editing | kie_ai
  "2c4802d0-f805-4c31-bab1-a07675e003eb": IdeogramV3Reframe as ModelModule,                 // Ideogram V3 Reframe | image_editing | kie_ai
  "f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c": MidjourneyI2I as ModelModule,                     // Midjourney I2I | image_editing | kie_ai
  "a70d01a3-05de-4918-b934-55a7e5e5d407": NanoBananaEdit as ModelModule,                     // Nano Banana by Google | image_editing | kie_ai
  "b4c5d6e7-8f9a-0b1c-2d3e-4f5a6b7c8d9e": NanoBananaProEditing as ModelModule,              // Nano Banana Pro | image_editing | kie_ai
  "b6d430f1-e823-4192-bf72-0dba29079931": QwenImageEditor as ModelModule,                   // Qwen Image Editor | image_editing | kie_ai
  "99532b69-d951-4431-87e3-1d88a9c8ee73": QwenImageToImage as ModelModule,                  // Qwen Image to Image | image_editing | kie_ai
  "58b8b09f-57fd-42e3-ae2d-689e9ea3064d": RemoveBackgroundKie as ModelModule,               // Remove Background | image_editing | kie_ai
  "d1d8b152-e123-4375-8f55-c0d0a699009b": RemoveBackgroundRunware as ModelModule,           // Remove Background | image_editing | runware
  "a3b4c5d6-7e8f-9a0b-1c2d-3e4f5a6b7c8d": Seedream45 as ModelModule,                        // Seedream 4.5 | image_editing | kie_ai
  "57f1e8f3-e4e3-42bd-bd9e-2f2ac6eee41d": SeedreamV4_ImageEditing as ModelModule,           // Seedream V4 | image_editing | kie_ai
  "f14e7b76-98a8-47c7-a0bc-e58dc9ba811c": RunwareUpscale as ModelModule,                    // runware:upscale | image_editing | runware

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT TO IMAGE MODELS (32 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "3b83cee8-6164-4d98-aebe-f4eadcb3da1d": ChatGPT4oImage_PromptToImage as ModelModule,      // ChatGPT 4o-Image | prompt_to_image | kie_ai
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890": FLUX2ProTextToImage as ModelModule,               // FLUX 2 Pro Text-to-Image | prompt_to_image | kie_ai
  "b2c3d4e5-f6a7-8901-bcde-f12345678901": FLUX2FlexTextToImage as ModelModule,              // FLUX 2 Flex Text-to-Image | prompt_to_image | kie_ai
  "c3d4e5f6-a7b8-9012-cdef-123456789012": ZImage as ModelModule,                            // Z-Image | prompt_to_image | kie_ai
  "f311e8bd-d7a8-4f81-b186-3ac6a5aefe8c": Flux1Dev as ModelModule,                          // Flux.1 Dev | prompt_to_image | runware
  "100@1": FLUX1Pro as ModelModule,                                                         // FLUX.1 Pro | prompt_to_image | runware
  "c1bd50df-1c27-48a3-8630-0970eedd21f6": FLUX1KontextMax_PromptToImage as ModelModule,     // FLUX.1 Kontext Max | prompt_to_image | kie_ai
  "94b43382-bf4b-490d-82b5-265d14473f9b": FLUX1KontextPro_PromptToImage as ModelModule,     // FLUX.1 Kontext Pro | prompt_to_image | kie_ai
  "schnell": FLUX1Schnell as ModelModule,                                                   // FLUX.1 Schnell | prompt_to_image | runware
  "32e98d54-3e47-41f8-ae70-0b0c18b78b8f": RunwareFlux1Schnell as ModelModule,               // runware flux 1 schnell | prompt_to_image | runware
  "5290ad50-ebeb-4fc0-97fb-bff7db6784b5": GoogleImagen4 as ModelModule,                     // Google Imagen 4 | prompt_to_image | kie_ai
  "0ff9bb96-041e-4c24-90c5-543064b642ca": GoogleImagen4Fast as ModelModule,                 // Google Imagen 4 Fast | prompt_to_image | kie_ai
  "23e81043-5e53-400b-bc1a-2a1ed9f30ce0": GoogleImagen4Ultra as ModelModule,                // Google Imagen 4 Ultra | prompt_to_image | kie_ai
  "49a79e90-830d-40ff-ad05-447cf0232592": GrokImagine_PromptToImage as ModelModule,         // Grok Imagine | prompt_to_image | kie_ai
  "79ce627d-f90c-47b2-ae3f-9437d93f4529": HiDreamDev as ModelModule,                        // HiDream Dev | prompt_to_image | runware
  "7fe80ee8-701c-49b9-a21e-79f8c82489c8": HiDreamFast as ModelModule,                       // HiDream Fast | prompt_to_image | runware
  "a8f5c3e9-7d4b-6f2c-9a1e-5d8b3c7f4a6e": IdeogramCharacter_PromptToImage as ModelModule,   // Ideogram Character | prompt_to_image | kie_ai
  "f9c5e7a3-8d4b-6f2c-9a1e-5d7b3c8f4a6e": IdeogramV2Plus as ModelModule,                     // Ideogram V2+ | prompt_to_image | kie_ai
  "94c0e508-226a-4e3d-8229-3820a61faa88": IdeogramV3 as ModelModule,                        // Ideogram V3 | prompt_to_image | kie_ai
  "d8c5a7f3-9b4e-6f2c-8a1d-5e7b3c9f4a6e": JasperTextToImage as ModelModule,                 // Jasper Text to Image | prompt_to_image | kie_ai
  "eff6c62e-c20e-4eed-9f5b-81e1a7f01529": Midjourney as ModelModule,                        // Midjourney | prompt_to_image | kie_ai
  "4c680009-d3fe-436f-85a7-467c76e85f9e": NanoBananaLovableAI as ModelModule,               // Nano Banana (Lovable AI) | prompt_to_image | lovable_ai_sync
  "09b03fa3-e648-4d42-8494-b91bd2e609b8": NanoBananaByGoogle as ModelModule,                // Nano Banana by Google | prompt_to_image | kie_ai
  "c5d6e7f8-9a0b-1c2d-3e4f-5a6b7c8d9e0f": NanoBananaProGeneration as ModelModule,           // Nano Banana Pro | prompt_to_image | kie_ai
  "36246bd4-f2e5-472b-bcf8-3dd99bc313d8": QwenQwenVL as ModelModule,                        // Qwen Text to Image | prompt_to_image | kie_ai
  "edc7a24b-b9da-46a7-8155-635626c0f9a3": RunwareFlux11Pro as ModelModule,                  // runware:101@1 | prompt_to_image | runware
  "c8f9b5e2-7d4a-6f3b-9e1c-5a8d3f7b4e9a": RunwareStableDiffusionV3 as ModelModule,          // runware stable diffusion v3 | prompt_to_image | runware
  "b7f8c5e2-6d4a-5f3b-8e1c-4a7d2f6b3e9a": RunwareStableDiffusionXL as ModelModule,          // runware stable diffusion xl | prompt_to_image | runware
  "ac90c626-ab01-4bc0-a000-9b952ddbde0e": SeedreamV3 as ModelModule,                        // Seedream V3 | prompt_to_image | kie_ai
  "c0e4f338-683a-4b5d-8289-518f2b5ea983": SeedreamV4_PromptToImage as ModelModule,          // Seedream V4 | prompt_to_image | kie_ai
  "d5e6f7a8-9b0c-1d2e-3f4a-5b6c7d8e9f0a": SeedreamV45_PromptToImage as ModelModule,         // Seedream V4.5 | prompt_to_image | kie_ai
  "f8c5a7e9-9d4b-6f2c-8a1e-5d7b3c9f4a6e": UltraDetailV0 as ModelModule,                     // Ultra Detail V0 | prompt_to_image | kie_ai

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE TO VIDEO MODELS (22 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "8aac94cb-5625-47f4-880c-4f0fd8bd83a1": GoogleVeo31Fast_ImageToVideo as ModelModule,      // Google Veo 3.1 Fast | image_to_video | kie_ai
  "a5c2ec16-6294-4588-86b6-7b4182601cda": GoogleVeo31HQ_ImageToVideo as ModelModule,        // Google Veo 3.1 HQ | image_to_video | kie_ai
  "6e8a863e-8630-4eef-bdbb-5b41f4c883f9": GoogleVeo31Reference as ModelModule,              // Google Veo 3.1 Reference | image_to_video | kie_ai
  "8c46aade-1272-4409-bb3a-3701e2423320": GrokImagine_ImageToVideo as ModelModule,          // Grok Imagine | image_to_video | kie_ai
  "f9b4c5d6-1e2f-3a4b-5c6d-7e8f9a0b1c2d": Hailuo02Pro_ImageToVideo as ModelModule,          // Hailuo 02 Pro | image_to_video | kie_ai
  "a0c5d6e7-2f3a-4b5c-6d7e-8f9a0b1c2d3e": Hailuo02Standard_ImageToVideo as ModelModule,     // Hailuo 02 Standard | image_to_video | kie_ai
  "b1d6e7f8-3a4b-5c6d-7e8f-9a0b1c2d3e4f": Hailuo23Pro_ImageToVideo as ModelModule,          // Hailuo 2.3 Pro | image_to_video | kie_ai
  "c2e7f8a9-4b5c-6d7e-8f9a-0b1c2d3e4f5a": Hailuo23Standard_ImageToVideo as ModelModule,     // Hailuo 2.3 Standard | image_to_video | kie_ai
  "b4c8d0e2-5f6a-7b8c-9d0e-1f2a3b4c5d6e": Kling26_ImageToVideo as ModelModule,              // Kling 2.6 | image_to_video | kie_ai
  "a3b7c9d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d": KlingV25TurboPro_ImageToVideo as ModelModule,     // Kling V2.5 Turbo Pro | image_to_video | kie_ai
  "c3397c13-3a52-4973-a87c-b4c20aca0fc0": KlingV2Master_ImageToVideo as ModelModule,        // Kling V2 Master | image_to_video | kie_ai
  "84084ca4-4153-46bc-8d01-cd4e37d1da68": KlingV2Pro_ImageToVideo as ModelModule,           // Kling V2 Pro | image_to_video | kie_ai
  "88e09730-07e0-4481-bda8-d9d9bde9fec6": KlingV2Standard_ImageToVideo as ModelModule,      // Kling V2 Standard | image_to_video | kie_ai
  "e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b": MidjourneyI2V as ModelModule,                     // Midjourney I2V | image_to_video | kie_ai
  "d2c37239-d544-4cce-bd8d-fb48ea44b287": Runway_ImageToVideo as ModelModule,               // Runway | image_to_video | kie_ai
  "d7df81f6-dc86-4e04-9f75-d4e8c9b03fb2": SeedanceV1Lite_ImageToVideo as ModelModule,      // Seedance V1 Lite | image_to_video | kie_ai
  "3ac57af3-f7f0-4205-b1a4-3c7c3c1c7dad": SeedanceV1ProFastRunware as ModelModule,          // Seedance V1.0 Pro Fast | image_to_video | runware
  "50eb3f02-1e58-4b85-a535-e8391a5623c4": SeedreamV1Pro_ImageToVideo as ModelModule,        // Seedream V1 Pro | image_to_video | kie_ai
  "11a995d9-a89e-47a2-b00c-11b2b7dbb717": Sora2OpenAI as ModelModule,                       // Sora 2 by OpenAI (Watermarked) | image_to_video | kie_ai
  "b0c4d5e6-1f2a-3b4c-5d6e-7f8a9b0c1d2e": Sora2_ImageToVideo as ModelModule,                // Sora 2 | image_to_video | kie_ai
  "c1d5e6f7-2a3b-4c5d-6e7f-8a9b0c1d2e3f": Sora2Pro_ImageToVideo as ModelModule,             // Sora 2 Pro | image_to_video | kie_ai
  "e4ae6c36-dfcb-4fe4-94f3-46962df720b1": WAN22Turbo_ImageToVideo as ModelModule,           // WAN 2.2 Turbo | image_to_video | kie_ai
  "e4f9a0b1-6c7d-8e9f-0a1b-2c3d4e5f6a7b": Wan22TurboNew_ImageToVideo as ModelModule,        // Wan 2.2 Turbo | image_to_video | kie_ai
  "a6b1c2d3-8e9f-0a1b-2c3d-4e5f6a7b8c9d": Wan25_ImageToVideo as ModelModule,                // Wan 2.5 | image_to_video | kie_ai
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT TO VIDEO MODELS (21 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "a96af675-b780-4879-a61f-7285be8766c2": GoogleVeo31Fast_PromptToVideo as ModelModule,     // Google Veo 3.1 Fast | prompt_to_video | kie_ai
  "d117daae-f3ec-4b79-b98f-adefeee21454": GoogleVeo31HQ_PromptToVideo as ModelModule,       // Google Veo 3.1 HQ | prompt_to_video | kie_ai
  "0643a43b-4995-4c5b-ac1d-76ea257a93a0": GrokImagine_PromptToVideo as ModelModule,         // Grok Imagine | prompt_to_video | kie_ai
  "d7f2a3b4-9c0d-1e2f-3a4b-5c6d7e8f9a0b": Hailuo02Pro_PromptToVideo as ModelModule,         // Hailuo 02 Pro | prompt_to_video | kie_ai
  "e8a3b4c5-0d1e-2f3a-4b5c-6d7e8f9a0b1c": Hailuo02Standard_PromptToVideo as ModelModule,    // Hailuo 02 Standard | prompt_to_video | kie_ai
  "d6e0f2a4-7b8c-9d0e-1f2a-3b4c5d6e7f8a": Kling26_PromptToVideo as ModelModule,             // Kling 2.6 | prompt_to_video | kie_ai
  "c5d9e1f3-6a7b-8c9d-0e1f-2a3b4c5d6e7f": KlingV25TurboPro_PromptToVideo as ModelModule,    // Kling V2.5 Turbo Pro | prompt_to_video | kie_ai
  "c5754cad-2b2c-4636-bc19-4ccaa97dde3d": KlingV2Master_PromptToVideo as ModelModule,       // Kling V2 Master | prompt_to_video | kie_ai
  "b6e8c4a3-5d2f-1c7e-8a0f-3d5b6c7e4a8f": KlingV2Pro_PromptToVideo as ModelModule,          // Kling V2 Pro | prompt_to_video | kie_ai
  "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b": KlingV2Standard_PromptToVideo as ModelModule,     // Kling V2 Standard | prompt_to_video | kie_ai
  "7bde9fb9-b16b-47b0-86a7-c0762a1a58e3": Runway_PromptToVideo as ModelModule,              // Runway | prompt_to_video | kie_ai
  "d9808197-5344-431e-a28e-b84482de076a": SeedanceV1Lite_PromptToVideo as ModelModule,     // Seedance V1 Lite | prompt_to_video | kie_ai
  "734c7712-aae3-4ad2-93b9-df198623503d": SeedanceV1ProFastRunware_PromptToVideo as ModelModule, // Seedance V1.0 Pro Fast | prompt_to_video | runware
  "b2e60db5-d8b5-4b27-971d-7e195e6ffeda": SeedreamV1Pro_PromptToVideo as ModelModule,       // Seedream V1 Pro | prompt_to_video | kie_ai
  "81a078c7-10fa-450c-92d5-c9f46166be45": Sora2OpenAI_PromptToVideo as ModelModule,         // Sora 2 by OpenAI (Watermarked) | prompt_to_video | kie_ai
  "e7f1a2b3-8c9d-0e1f-2a3b-4c5d6e7f8a9b": Sora2_PromptToVideo as ModelModule,               // Sora 2 | prompt_to_video | kie_ai
  "f8a2b3c4-9d0e-1f2a-3b4c-5d6e7f8a9b0c": Sora2Pro_PromptToVideo as ModelModule,            // Sora 2 Pro | prompt_to_video | kie_ai
  "a9b3c4d5-0e1f-2a3b-4c5d-6e7f8a9b0c1d": Sora2ProStoryboard_PromptToVideo as ModelModule,  // Sora 2 Pro Storyboard | prompt_to_video | kie_ai
  "0aaf528a-1334-4121-8467-331c95e8da6d": WAN22Turbo_PromptToVideo as ModelModule,          // WAN 2.2 Turbo | prompt_to_video | kie_ai
  "d3e8f9a0-5b6c-7d8e-9f0a-1b2c3d4e5f6a": Wan22TurboNew_PromptToVideo as ModelModule,       // Wan 2.2 Turbo | prompt_to_video | kie_ai
  "f5a0b1c2-7d8e-9f0a-1b2c-3d4e5f6a7b8c": Wan25_PromptToVideo as ModelModule,               // Wan 2.5 | prompt_to_video | kie_ai

  // ═══════════════════════════════════════════════════════════════════════════
  // LIP SYNC MODELS (4 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "a7b8c9d0-1e2f-3a4b-5c6d-7e8f9a0b1c2d": KlingV1AvatarStandard_LipSync as ModelModule,   // Kling Avatar Standard | lip_sync | kie_ai
  "b8c9d0e1-2f3a-4b5c-6d7e-8f9a0b1c2d3e": KlingAIAvatarV1Pro_LipSync as ModelModule,      // Kling Avatar Pro | lip_sync | kie_ai
  "a9b0c1d2-3e4f-5a6b-7c8d-9e0f1a2b3c4d": Infinitalk_LipSync as ModelModule,              // Infinitalk | lip_sync | kie_ai
  "c0d1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f": Wan22SpeechToVideo_LipSync as ModelModule,      // Wan 2.2 Speech-to-Video | lip_sync | kie_ai

  // ═══════════════════════════════════════════════════════════════════════════
  // VIDEO TO VIDEO MODELS (2 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "f1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c": TopazVideoUpscale as ModelModule,                 // Topaz Video Upscale | video_to_video | kie_ai
  "a2b3c4d5-6e7f-8a9b-0c1d-2e3f4a5b6c7d": Wan26_VideoToVideo as ModelModule,                // Wan 2.6 V2V | video_to_video | kie_ai

  // Additional Wan 2.6 models
  "b3c4d5e6-7f8a-9b0c-1d2e-3f4a5b6c7d8e": Wan26_ImageToVideo as ModelModule,                // Wan 2.6 I2V | image_to_video | kie_ai
  "c4d5e6f7-8a9b-0c1d-2e3f-4a5b6c7d8e9f": Wan26_PromptToVideo as ModelModule,               // Wan 2.6 T2V | prompt_to_video | kie_ai
};

/**
 * Get model module by record_id (preferred) or model_id (fallback)
 */
export function getModelModule(recordId: string, modelId?: string): ModelModule | null {
  // Prefer record_id lookup (unique identifier)
  if (RECORD_ID_REGISTRY[recordId]) {
    return RECORD_ID_REGISTRY[recordId];
  }
  
  // Fallback to model_id if provided
  if (modelId && MODEL_REGISTRY[modelId]) {
    return MODEL_REGISTRY[modelId];
  }
  
  return null;
}

/**
 * Check if a model file exists
 */
export function modelFileExists(recordId: string, modelId?: string): boolean {
  return getModelModule(recordId, modelId) !== null;
}

/**
 * Get all available model record IDs
 */
export function getAvailableModelRecordIds(): string[] {
  return Object.keys(RECORD_ID_REGISTRY);
}

/**
 * Get all available model IDs
 */
export function getAvailableModelIds(): string[] {
  return Object.keys(MODEL_REGISTRY);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADR 007 REQUIRED HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * These functions support the direct model execution architecture
 * where model .ts files handle their own API calls
 */

/**
 * Get model by record_id (throws if not found)
 * This is the PRIMARY lookup method per ADR 007
 */
export function getModel(recordId: string): ModelModule {
  const model = RECORD_ID_REGISTRY[recordId];
  if (!model) {
    throw new Error(`Model not found: ${recordId}`);
  }
  return model;
}

/**
 * Get all model modules
 * Returns array of complete ModelModule objects (includes MODEL_CONFIG and SCHEMA)
 * Updated per complete migration to .ts file control
 */
export function getAllModels(): ModelModule[] {
  return Object.values(RECORD_ID_REGISTRY);
}

/**
 * Get models filtered by content type
 * @param type - 'image', 'video', 'audio'
 */
export function getModelsByContentType(type: string): ModelModule[] {
  return Object.values(RECORD_ID_REGISTRY)
    .filter(m => m.MODEL_CONFIG.contentType === type);
}

/**
 * Get models filtered by provider
 */
export function getModelsByProvider(provider: string): ModelModule[] {
  return Object.values(RECORD_ID_REGISTRY)
    .filter(m => m.MODEL_CONFIG.provider === provider);
}
