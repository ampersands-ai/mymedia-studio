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

// Prompt to Image Models (6 so far)
import * as ChatGPT4oImage_PromptToImage from "./prompt_to_image/ChatGPT_4o_Image";
import * as Flux1Dev from "./prompt_to_image/Flux_1_Dev";
import * as FLUX1KontextMax_PromptToImage from "./prompt_to_image/FLUX_1_Kontext_Max_prompt";
import * as FLUX1KontextPro_PromptToImage from "./prompt_to_image/FLUX_1_Kontext_Pro_prompt";
import * as FLUX1Pro from "./prompt_to_image/FLUX_1_Pro";
import * as FLUX1Schnell from "./prompt_to_image/FLUX_1_Schnell";

// TODO: Remaining prompt_to_image and prompt_to_video models

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
 * Registry mapping model IDs to their modules
 * Key: model.id (from database)
 * Value: Model module with SCHEMA, execute(), etc.
 */
export const MODEL_REGISTRY: Record<string, ModelModule> = {
  // Image Editing
  "4o-image-api": ChatGPT4oImage_ImageEditing as ModelModule,
  "recraft/crisp-upscale": RecraftCrispUpscale as ModelModule,
  
  // Prompt to Image (note: same model ID, different record_id)
  // Will be resolved by record_id in the lookup function
  
  // Prompt to Audio
  "elevenlabs/text-to-speech-turbo-2-5": ElevenLabsFast as ModelModule,
  
  // TODO: Add remaining 56 models
};

/**
 * Registry mapping record_ids to their modules
 * This is the primary lookup since record_id is unique
 */
export const RECORD_ID_REGISTRY: Record<string, ModelModule> = {
  // Image Editing (15)
  "4b68811b-28be-45cb-bcae-9db721ba4547": ChatGPT4oImage_ImageEditing as ModelModule,
  "00ef3f28-4fab-4244-b93f-0ba48641fcbd": RecraftCrispUpscale as ModelModule,
  "ab0ae096-f0ef-4197-b186-f38d69e72dd3": FLUX1KontextMax_ImageEditing as ModelModule,
  "d0ef1f83-a613-47d4-82f8-10e41da3e2a0": FLUX1KontextPro_ImageEditing as ModelModule,
  "2959b083-2177-4b8c-ae56-31170c2eb9dc": GoogleImageUpscale as ModelModule,
  "4a421ed9-ed0c-40bf-b06d-892871506124": IdeogramCharacter_ImageEditing as ModelModule,
  "fa2d60c2-4fc5-4d77-bc60-36e10dbf9e2b": IdeogramImageRemix as ModelModule,
  "4c0b52d9-1dea-467e-8c96-1c7c9b24bf4a": IdeogramV3Reframe as ModelModule,
  "58a5db33-7729-48e8-88e5-ee05ea4c0c13": QwenImageEditor as ModelModule,
  "b5d09ee9-3b13-49b7-a1b3-fbd63a45b02b": QwenImageToImage as ModelModule,
  "0c77b10f-7b51-45fe-9e4e-cb30ebd61819": RemoveBackgroundKie as ModelModule,
  "d2f8b5e4-3a9c-4c72-8f61-2e4d9a7b6c3f": RemoveBackgroundRunware as ModelModule,
  "d2ffb834-fc59-4c80-bf48-c2cc25281fdd": SeedreamV4_ImageEditing as ModelModule,
  "e8c4a9f2-6b7d-4e3a-9c1f-5d8b7a3e6f2c": RunwareUpscale as ModelModule,
  
  // Image to Video (13)
  "8aac94cb-5625-47f4-880c-4f0fd8bd83a1": GoogleVeo31Fast_ImageToVideo as ModelModule,
  "a5c2ec16-6294-4588-86b6-7b4182601cda": GoogleVeo31HQ_ImageToVideo as ModelModule,
  "6e8a863e-8630-4eef-bdbb-5b41f4c883f9": GoogleVeo31Reference as ModelModule,
  "8c46aade-1272-4409-bb3a-3701e2423320": GrokImagine_ImageToVideo as ModelModule,
  "c3397c13-3a52-4973-a87c-b4c20aca0fc0": KlingV2Master_ImageToVideo as ModelModule,
  "84084ca4-4153-47d3-82db-c9e1d5f8a7b2": KlingV2Pro_ImageToVideo as ModelModule,
  "a2f3b7e9-5c8d-4f6a-9e1b-3d7c8a4f5e6b": KlingV2Standard_ImageToVideo as ModelModule,
  "b8f9c5e2-6d4a-3f7b-9e8c-5a7d3f6b4e9a": Runway_ImageToVideo as ModelModule,
  "f3c7e9a2-4d5b-6f8c-9a1e-3b7d5c8f4a6e": SeedanceV1Lite_ImageToVideo as ModelModule,
  "e6d9a4f7-2c5b-8f3e-9a7d-4c8f5b6e3a9d": SeedreamV1Pro_ImageToVideo as ModelModule,
  "d7f8c5a3-9b2e-6f4d-8c9a-5e7b3a6d4f8c": Sora2OpenAI as ModelModule,
  "c9e5a7f3-8d4b-6f2c-9a8e-5d7b3c4f6a9e": WAN22Turbo_ImageToVideo as ModelModule,
  "f8a6c4e9-7d3b-5f9c-8a2e-6d4b7c5f9a3e": SeedanceV1ProFastRunware as ModelModule,
  
  // Prompt to Audio (3)
  "379f8945-bd7f-48f3-a1bb-9d2e2413234c": ElevenLabsFast as ModelModule,
  "45fc7e71-0174-48eb-998d-547e8d2476db": ElevenLabsTTS as ModelModule,
  "a7c9e4f6-8d2b-5f3c-9a6e-7d4b8c5f3a9e": Suno as ModelModule,
  
  // Prompt to Image (6)
  "3b83cee8-6164-4d98-aebe-f4eadcb3da1d": ChatGPT4oImage_PromptToImage as ModelModule,
  "f311e8bd-d7a8-4f81-b186-3ac6a5aefe8c": Flux1Dev as ModelModule,
  "c1bd50df-1c27-48a3-8630-0970eedd21f6": FLUX1KontextMax_PromptToImage as ModelModule,
  "94b43382-bf4b-490d-82b5-265d14473f9b": FLUX1KontextPro_PromptToImage as ModelModule,
  "100@1": FLUX1Pro as ModelModule,
  "schnell": FLUX1Schnell as ModelModule,
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
