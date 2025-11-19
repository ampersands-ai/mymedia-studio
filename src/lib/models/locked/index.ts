/**
 * Model Registry - Central index of all isolated model files
 * Each model is completely independent with zero shared logic
 */

// Image Editing Models
import * as ChatGPT4oImage_ImageEditing from "./image_editing/ChatGPT_4o_Image";
import * as RecraftCrispUpscale from "./image_editing/Recraft_Crisp_Upscale";

// Prompt to Image Models
import * as ChatGPT4oImage_PromptToImage from "./prompt_to_image/ChatGPT_4o_Image";

// Prompt to Audio Models
import * as ElevenLabsFast from "./prompt_to_audio/ElevenLabs_Fast";

// TODO: Import remaining 56 models as they are created

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
  // Image Editing
  "4b68811b-28be-45cb-bcae-9db721ba4547": ChatGPT4oImage_ImageEditing as ModelModule,
  "00ef3f28-4fab-4244-b93f-0ba48641fcbd": RecraftCrispUpscale as ModelModule,
  
  // Prompt to Image
  "3b83cee8-6164-4d98-aebe-f4eadcb3da1d": ChatGPT4oImage_PromptToImage as ModelModule,
  
  // Prompt to Audio
  "379f8945-bd7f-48f3-a1bb-9d2e2413234c": ElevenLabsFast as ModelModule,
  
  // TODO: Add remaining 56 models
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
