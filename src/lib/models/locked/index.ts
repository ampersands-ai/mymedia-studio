/**
 * Model Registry - Central index of all isolated model files
 * Each model is completely independent with zero shared logic
 */

// Image Editing Models (15)
import * as ChatGPT4oImage_ImageEditing from "./image_editing/ChatGPT_4o_Image";
import * as RecraftCrispUpscale from "./image_editing/Recraft_Crisp_Upscale";
import * as FLUX1KontextMax_ImageEditing from "./image_editing/FLUX_1_Kontext_Max";
import * as FLUX1KontextPro_ImageEditing from "./image_editing/FLUX_1_Kontext_Pro";
import * as GoogleImageUpscale from "./image_editing/Google_Image_Upscale";
import * as IdeogramCharacter_ImageEditing from "./image_editing/Ideogram_Character";
import * as IdeogramImageRemix from "./image_editing/Ideogram_Image_Remix";
import * as IdeogramV3Reframe from "./image_editing/Ideogram_V3_Reframe";
import * as QwenImageEditor from "./image_editing/Qwen_Image_Editor";
import * as QwenImageToImage from "./image_editing/Qwen_Image_to_Image";
import * as RemoveBackgroundKie from "./image_editing/Remove_Background_kie_ai";
import * as RemoveBackgroundRunware from "./image_editing/Remove_Background_runware";
import * as SeedreamV4_ImageEditing from "./image_editing/Seedream_V4";
import * as RunwareUpscale from "./image_editing/runware_upscale";

// Image to Video Models (14)
import * as GoogleVeo31Fast_ImageToVideo from "./image_to_video/Google_Veo_3_1_Fast";
import * as GoogleVeo31HQ_ImageToVideo from "./image_to_video/Google_Veo_3_1_HQ";
import * as GoogleVeo31Reference from "./image_to_video/Google_Veo_3_1_Reference";
import * as GrokImagine_ImageToVideo from "./image_to_video/Grok_Imagine";
import * as KlingV2Master_ImageToVideo from "./image_to_video/Kling_V2_Master";
import * as KlingV2Pro_ImageToVideo from "./image_to_video/Kling_V2_Pro";
import * as KlingV2Standard_ImageToVideo from "./image_to_video/Kling_V2_Standard";
import * as Runway_ImageToVideo from "./image_to_video/Runway";
import * as SeedanceV1Lite_ImageToVideo from "./image_to_video/Seedance_V1_Lite";
import * as SeedreamV1Pro_ImageToVideo from "./image_to_video/Seedream_V1_Pro";
import * as Sora2OpenAI from "./image_to_video/Sora_2_by_OpenAI_Watermarked";
import * as WAN22Turbo_ImageToVideo from "./image_to_video/WAN_2_2_Turbo";
import * as SeedanceV1ProFastRunware from "./image_to_video/Seedance_V1_0_Pro_Fast_runware";

// Prompt to Audio Models (3)
import * as ElevenLabsFast from "./prompt_to_audio/ElevenLabs_Fast";
import * as ElevenLabsTTS from "./prompt_to_audio/ElevenLabs_TTS";
import * as Suno from "./prompt_to_audio/Suno";

// Prompt to Image Models (18)
import * as ChatGPT4oImage_PromptToImage from "./prompt_to_image/ChatGPT_4o_Image";
import * as Flux1Dev from "./prompt_to_image/Flux_1_Dev";
import * as FLUX1KontextMax_PromptToImage from "./prompt_to_image/FLUX_1_Kontext_Max_prompt";
import * as FLUX1KontextPro_PromptToImage from "./prompt_to_image/FLUX_1_Kontext_Pro_prompt";
import * as FLUX1Pro from "./prompt_to_image/FLUX_1_Pro";
import * as FLUX1Schnell from "./prompt_to_image/FLUX_1_Schnell";
import * as GoogleImagen4 from "./prompt_to_image/Google_Imagen_4";
import * as IdeogramCharacter_PromptToImage from "./prompt_to_image/Ideogram_Character";
import * as IdeogramV2Plus from "./prompt_to_image/Ideogram_V2_Plus";
import * as IdeogramV3 from "./prompt_to_image/Ideogram_V3";
import * as JasperTextToImage from "./prompt_to_image/Jasper_Text_to_Image";
import * as NanoBananaByGoogle from "./prompt_to_image/Nano_Banana_by_Google";
import * as QwenQwenVL from "./prompt_to_image/Qwen_QwenVL";
import * as SeedreamV4_PromptToImage from "./prompt_to_image/Seedream_V4";
import * as UltraDetailV0 from "./prompt_to_image/Ultra_Detail_V0";
import * as RunwareFlux11Pro from "./prompt_to_image/runware_flux_1_1_pro";
import * as RunwareFlux1Schnell from "./prompt_to_image/runware_flux_1_schnell";
import * as RunwareStableDiffusionV3 from "./prompt_to_image/runware_stable_diffusion_v3";
import * as RunwareStableDiffusionXL from "./prompt_to_image/runware_stable_diffusion_xl";

// Prompt to Video Models (11)
import * as GoogleVeo31Fast_PromptToVideo from "./prompt_to_video/Google_Veo_3_1_Fast";
import * as GoogleVeo31HQ_PromptToVideo from "./prompt_to_video/Google_Veo_3_1_HQ";
import * as GrokImagine_PromptToVideo from "./prompt_to_video/Grok_Imagine";
import * as KlingV2Master_PromptToVideo from "./prompt_to_video/Kling_V2_Master";
import * as KlingV2Pro_PromptToVideo from "./prompt_to_video/Kling_V2_Pro";
import * as KlingV2Standard_PromptToVideo from "./prompt_to_video/Kling_V2_Standard";
import * as Runway_PromptToVideo from "./prompt_to_video/Runway";
import * as SeedanceV1Lite_PromptToVideo from "./prompt_to_video/Seedance_V1_Lite";
import * as SeedreamV1Pro_PromptToVideo from "./prompt_to_video/Seedream_V1_Pro";
import * as Sora2OpenAI_PromptToVideo from "./prompt_to_video/Sora_2_by_OpenAI_Watermarked";
import * as WAN22Turbo_PromptToVideo from "./prompt_to_video/WAN_2_2_Turbo";

interface ModelModule {
  MODEL_CONFIG: {
    modelId: string;
    recordId: string;
    modelName: string;
    provider: string;
    contentType: string;
    baseCreditCost: number;
    estimatedTimeSeconds: number;
    costMultipliers: any;
    apiEndpoint: string | null;
    payloadStructure: string;
    maxImages: number | null;
    defaultOutputs: number;
  };
  SCHEMA: any;
  validate: (inputs: Record<string, any>) => { valid: boolean; error?: string };
  preparePayload: (inputs: Record<string, any>) => Record<string, any>;
  calculateCost: (inputs: Record<string, any>) => number;
  execute: (params: any) => Promise<string>;
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
 * Total: 60 models across 5 groups
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const RECORD_ID_REGISTRY: Record<string, ModelModule> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE EDITING MODELS (15 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "4b68811b-28be-45cb-bcae-9db721ba4547": ChatGPT4oImage_ImageEditing as ModelModule,      // ChatGPT 4o Image
  "00ef3f28-4fab-4244-b93f-0ba48641fcbd": RecraftCrispUpscale as ModelModule,               // Recraft Crisp Upscale
  "ab0ae096-f0ef-4197-b186-f38d69e72dd3": FLUX1KontextMax_ImageEditing as ModelModule,      // FLUX.1 Kontext Max
  "d0ef1f83-a613-47d4-82f8-10e41da3e2a0": FLUX1KontextPro_ImageEditing as ModelModule,      // FLUX.1 Kontext Pro
  "2959b083-2177-4b8c-ae56-31170c2eb9dc": GoogleImageUpscale as ModelModule,                 // Google Image Upscale
  "4a421ed9-ed0c-40bf-b06d-892871506124": IdeogramCharacter_ImageEditing as ModelModule,    // Ideogram Character
  "fa2d60c2-4fc5-4d77-bc60-36e10dbf9e2b": IdeogramImageRemix as ModelModule,                // Ideogram Image Remix
  "4c0b52d9-1dea-467e-8c96-1c7c9b24bf4a": IdeogramV3Reframe as ModelModule,                 // Ideogram V3 Reframe
  "58a5db33-7729-48e8-88e5-ee05ea4c0c13": QwenImageEditor as ModelModule,                   // Qwen Image Editor
  "b5d09ee9-3b13-49b7-a1b3-fbd63a45b02b": QwenImageToImage as ModelModule,                  // Qwen Image to Image
  "0c77b10f-7b51-45fe-9e4e-cb30ebd61819": RemoveBackgroundKie as ModelModule,               // Remove Background (kie.ai)
  "d1d8b152-e123-4375-8f55-c0d0a699009b": RemoveBackgroundRunware as ModelModule,           // Remove Background (runware) - REAL RECORD_ID
  "d2ffb834-fc59-4c80-bf48-c2cc25281fdd": SeedreamV4_ImageEditing as ModelModule,           // Seedream V4
  "e8c4a9f2-6b7d-4e3a-9c1f-5d8b7a3e6f2c": RunwareUpscale as ModelModule,                    // Runware Upscale
  
  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE TO VIDEO MODELS (14 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "8aac94cb-5625-47f4-880c-4f0fd8bd83a1": GoogleVeo31Fast_ImageToVideo as ModelModule,      // Google Veo 3.1 Fast
  "a96af675-b780-4879-a61f-7285be8766c2": GoogleVeo31Fast_ImageToVideo as ModelModule,      // Google Veo 3.1 Fast (duplicate) - REAL RECORD_ID
  "a5c2ec16-6294-4588-86b6-7b4182601cda": GoogleVeo31HQ_ImageToVideo as ModelModule,        // Google Veo 3.1 HQ
  "d117daae-f3ec-4b79-b98f-adefeee21454": GoogleVeo31HQ_ImageToVideo as ModelModule,        // Google Veo 3.1 HQ (duplicate) - REAL RECORD_ID
  "6e8a863e-8630-4eef-bdbb-5b41f4c883f9": GoogleVeo31Reference as ModelModule,              // Google Veo 3.1 Reference
  "8c46aade-1272-4409-bb3a-3701e2423320": GrokImagine_ImageToVideo as ModelModule,          // Grok Imagine
  "c3397c13-3a52-4973-a87c-b4c20aca0fc0": KlingV2Master_ImageToVideo as ModelModule,        // Kling V2 Master
  "84084ca4-4153-47d3-82db-c9e1d5f8a7b2": KlingV2Pro_ImageToVideo as ModelModule,           // Kling V2 Pro
  "a2f3b7e9-5c8d-4f6a-9e1b-3d7c8a4f5e6b": KlingV2Standard_ImageToVideo as ModelModule,      // Kling V2 Standard
  "b8f9c5e2-6d4a-3f7b-9e8c-5a7d3f6b4e9a": Runway_ImageToVideo as ModelModule,               // Runway
  "f3c7e9a2-4d5b-6f8c-9a1e-3b7d5c8f4a6e": SeedanceV1Lite_ImageToVideo as ModelModule,      // Seedance V1 Lite
  "e6d9a4f7-2c5b-8f3e-9a7d-4c8f5b6e3a9d": SeedreamV1Pro_ImageToVideo as ModelModule,        // Seedream V1 Pro
  "d7f8c5a3-9b2e-6f4d-8c9a-5e7b3a6d4f8c": Sora2OpenAI as ModelModule,                       // Sora 2 by OpenAI (Watermarked)
  "c9e5a7f3-8d4b-6f2c-9a8e-5d7b3c4f6a9e": WAN22Turbo_ImageToVideo as ModelModule,           // WAN 2.2 Turbo
  "3ac57af3-f7f0-4205-b1a4-3c7c3c1c7dad": SeedanceV1ProFastRunware as ModelModule,          // Seedance V1.0 Pro Fast (runware) - REAL RECORD_ID
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT TO AUDIO MODELS (3 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "379f8945-bd7f-48f3-a1bb-9d2e2413234c": ElevenLabsFast as ModelModule,                    // ElevenLabs Fast
  "45fc7e71-0174-48eb-998d-547e8d2476db": ElevenLabsTTS as ModelModule,                     // ElevenLabs TTS
  "a7c9e4f6-8d2b-5f3c-9a6e-7d4b8c5f3a9e": Suno as ModelModule,                              // Suno
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT TO IMAGE MODELS (18 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "3b83cee8-6164-4d98-aebe-f4eadcb3da1d": ChatGPT4oImage_PromptToImage as ModelModule,      // ChatGPT 4o Image
  "f311e8bd-d7a8-4f81-b186-3ac6a5aefe8c": Flux1Dev as ModelModule,                          // Flux 1 Dev - REAL RECORD_ID
  "c1bd50df-1c27-48a3-8630-0970eedd21f6": FLUX1KontextMax_PromptToImage as ModelModule,     // FLUX.1 Kontext Max
  "94b43382-bf4b-490d-82b5-265d14473f9b": FLUX1KontextPro_PromptToImage as ModelModule,     // FLUX.1 Kontext Pro
  "100@1": FLUX1Pro as ModelModule,                                                          // FLUX.1 Pro
  "32e98d54-3e47-41f8-ae70-0b0c18b78b8f": FLUX1Schnell as ModelModule,                      // FLUX.1 Schnell - REAL RECORD_ID
  "schnell": FLUX1Schnell as ModelModule,                                                    // FLUX.1 Schnell (alias)
  "2d5f8c3a-9b7e-4f6d-8c1a-5e3b9a6f4d8c": GoogleImagen4 as ModelModule,                     // Google Imagen 4
  "a8f5c3e9-7d4b-6f2c-9a1e-5d8b3c7f4a6e": IdeogramCharacter_PromptToImage as ModelModule,   // Ideogram Character
  "f9c5e7a3-8d4b-6f2c-9a1e-5d7b3c8f4a6e": IdeogramV2Plus as ModelModule,                    // Ideogram V2+
  "e7c9a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e": IdeogramV3 as ModelModule,                        // Ideogram V3
  "d8c5a7f3-9b4e-6f2c-8a1d-5e7b3c9f4a6e": JasperTextToImage as ModelModule,                 // Jasper Text to Image
  "c7e9a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e": NanoBananaByGoogle as ModelModule,                // Nano Banana by Google
  "b8f9c5e2-7d4a-6f3b-9e1c-5a8d3f7b4e9a": QwenQwenVL as ModelModule,                        // Qwen QwenVL
  "a6c8e4f7-9d2b-5f3c-8a6e-7d4b9c5f3a8e": SeedreamV4_PromptToImage as ModelModule,          // Seedream V4
  "f8c5a7e9-9d4b-6f2c-8a1e-5d7b3c9f4a6e": UltraDetailV0 as ModelModule,                     // Ultra Detail V0
  "e9c7a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e": RunwareFlux11Pro as ModelModule,                  // runware flux 1.1 pro
  "d9c7a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e": RunwareFlux1Schnell as ModelModule,               // runware flux 1 schnell
  "c8f9b5e2-7d4a-6f3b-9e1c-5a8d3f7b4e9a": RunwareStableDiffusionV3 as ModelModule,          // runware stable diffusion v3
  "b7f8c5e2-6d4a-5f3b-8e1c-4a7d2f6b3e9a": RunwareStableDiffusionXL as ModelModule,          // runware stable diffusion xl
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT TO VIDEO MODELS (11 total)
  // ═══════════════════════════════════════════════════════════════════════════
  "f8e9c7a5-9d4b-6f2c-8a1e-5d7b3c9f4a6e": GoogleVeo31Fast_PromptToVideo as ModelModule,     // Google Veo 3.1 Fast
  "e9c8b7a6-8d5c-4f3e-9a2f-6d8b5c9e4a7f": GoogleVeo31HQ_PromptToVideo as ModelModule,       // Google Veo 3.1 HQ
  "d8c7b6a5-7e4f-3c2d-8a1f-5d7b8c9e4a6f": GrokImagine_PromptToVideo as ModelModule,         // Grok Imagine
  "c7e9b5a4-6d3f-2c8e-9a1f-4d6b7c8e5a9f": KlingV2Master_PromptToVideo as ModelModule,       // Kling V2 Master
  "b6e8c4a3-5d2f-1c7e-8a0f-3d5b6c7e4a8f": KlingV2Pro_PromptToVideo as ModelModule,          // Kling V2 Pro
  "a5e7c3a2-4d1f-0c6e-7a9f-2d4b5c6e3a7f": KlingV2Standard_PromptToVideo as ModelModule,     // Kling V2 Standard
  "f9e8c7b6-8d5c-4f3e-9a2f-6d8b5c9e4a7f": Runway_PromptToVideo as ModelModule,              // Runway
  "e8d7c6b5-7e4f-3c2d-8a1f-5d7b8c9e4a6f": SeedanceV1Lite_PromptToVideo as ModelModule,     // Seedance V1 Lite
  "734c7712-aae3-4ad2-93b9-df198623503d": SeedanceV1Lite_PromptToVideo as ModelModule,     // Seedance V1.0 Pro Fast - REAL RECORD_ID
  "d7c6b5a4-6e3f-2c1d-7a0f-4d6b7c8e5a9f": SeedreamV1Pro_PromptToVideo as ModelModule,       // Seedream V1 Pro
  "c6e5b4a3-5d2f-1c0e-6a9f-3d5b6c7e4a8f": Sora2OpenAI_PromptToVideo as ModelModule,         // Sora 2 by OpenAI (Watermarked)
  "b5e4c3a2-4d1f-0c9e-5a8f-2d4b5c6e3a7f": WAN22Turbo_PromptToVideo as ModelModule,          // WAN 2.2 Turbo
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
