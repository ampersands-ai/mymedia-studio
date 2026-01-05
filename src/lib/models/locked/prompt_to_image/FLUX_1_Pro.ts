/** FLUX.1 Pro prompt_to_image - Record: 7a2f8c3e-4b5d-6e9a-1f8c-2d4b6e9a3f5c */
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { executeModelGeneration } from "@/lib/models/shared/executeModelGeneration";
import { API_ENDPOINTS } from "@/lib/config/api-endpoints";

export const MODEL_CONFIG = {
  modelId: "runware:100@1",
  recordId: "7a2f8c3e-4b5d-6e9a-1f8c-2d4b6e9a3f5c",
  modelName: "FLUX.1 Pro",
  provider: "runware",
  contentType: "prompt_to_image",
  use_api_key: "RUNWARE_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 0.2,
  estimatedTimeSeconds: 15,
  costMultipliers: {},
  apiEndpoint: API_ENDPOINTS.RUNWARE.fullUrl,
  payloadStructure: "flat",
  maxImages: 0,
  defaultOutputs: 1,

  // UI metadata
  isActive: true,
  logoUrl: "/logos/flux.png",
  modelFamily: "FLUX",
  variantName: "1 Pro",
  displayOrderInFamily: 3,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/FLUX_1_Pro.ts"
} as const;

export const SCHEMA = {
  properties: {
    positivePrompt: {
      maxLength: 5000,
      renderer: "prompt",
      title: "Prompt",
      type: "string"
    },
    numberResults: {
      default: 1,
      showToUser: false,
      type: "integer"
    },
    outputFormat: {
      default: "PNG",
      enum: ["WEBP", "JPEG", "PNG"],
      type: "string"
    }
  },
  required: ["positivePrompt", "numberResults", "outputFormat"],
  type: "object"
} as const;

export function validate(inputs: Record<string, any>) {
  return inputs.positivePrompt ? { valid: true } : { valid: false, error: "Prompt required" };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    taskType: "imageInference",
    positivePrompt: inputs.positivePrompt,
    numberResults: inputs.numberResults || 1,
    outputFormat: inputs.outputFormat || "PNG",
    width: 896,
    height: 1152,
    steps: 4,
    CFGScale: 1,
    scheduler: "FlowMatchEulerDiscreteScheduler",
    includeCost: true,
    checkNSFW: true,
    outputType: ["URL"]
  };
}

export function calculateCost(_inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
}

// ============================================================================
// STORYBOARD DEFAULTS - Exact parameters for storyboard generation
// ============================================================================

import type { StoryboardContext, StoryboardDefaults } from "@/lib/models/types/storyboard";

const DIMENSION_PRESETS = {
  "9:16": { width: 896, height: 1152 },
  "16:9": { width: 1152, height: 896 },
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
} as const;

/**
 * Returns exact provider-ready parameters for storyboard image generation.
 * Only includes parameters that Runware actually accepts for this model.
 */
export function getStoryboardDefaults(ctx: StoryboardContext): StoryboardDefaults {
  const aspectRatio = (ctx.aspectRatio || "9:16") as keyof typeof DIMENSION_PRESETS;
  const dimensions = DIMENSION_PRESETS[aspectRatio] || DIMENSION_PRESETS["9:16"];

  return {
    taskType: "imageInference",
    positivePrompt: ctx.prompt || "",
    numberResults: 1,
    outputFormat: "PNG",
    width: dimensions.width,
    height: dimensions.height,
    steps: 4,
    CFGScale: 1,
    scheduler: "FlowMatchEulerDiscreteScheduler",
    includeCost: true,
    checkNSFW: true,
    outputType: ["URL"],
  };
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  return executeModelGeneration({
    modelConfig: MODEL_CONFIG,
    modelSchema: SCHEMA,
    modelFunctions: { validate, calculateCost, preparePayload },
    params,
    promptField: 'positivePrompt'
  });
}
