/**
 * Runware Z-Image Turbo (Text-to-Image)
 * 
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 * 
 * NEW PROVIDER: Runware (NOT KIE.AI)
 * - External endpoint: https://api.runware.ai/v1
 * - Payload: ARRAY of task objects (unique structure)
 * - Uses taskType: "imageInference"
 * - Uses positivePrompt (not prompt)
 * - Width/height instead of aspect_ratio
 * 
 * @locked
 * @model runware:z-image@turbo
 * @provider runware
 * @version 1.0.0
 */

import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

export const MODEL_CONFIG = {
  modelId: "runware:z-image@turbo",
  recordId: "d4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f9a",
  modelName: "Z-Image Turbo",
  provider: "runware", // NEW PROVIDER
  contentType: "prompt_to_image",
  use_api_key: "RUNWARE_API_KEY",
  baseCreditCost: 1,
  estimatedTimeSeconds: 10,
  costMultipliers: {
    numberResults: { 1: 1, 2: 2, 3: 3, 4: 4 },
  },
  apiEndpoint: "https://api.runware.ai/v1", // External endpoint
  payloadStructure: "array", // Unique: array of task objects
  maxImages: 0, // T2I - no input images
  defaultOutputs: 1,
  // Runware-specific
  taskType: "imageInference",
  outputFormat: "JPEG",
  outputType: ["URL"],
  // UI metadata
  isActive: true,
  logoUrl: "/logos/runware.png",
  modelFamily: "Runware",
  variantName: "Z-Image Turbo",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Runware_Z_Image_Turbo.ts",
} as const;

// ============================================================================
// PRESET DIMENSIONS
// ============================================================================

const DIMENSION_PRESETS = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1152, height: 640 },
  "9:16": { width: 640, height: 1152 },
  "4:3": { width: 1152, height: 896 },
  "3:4": { width: 896, height: 1152 },
  "21:9": { width: 1536, height: 640 },
  "3:2": { width: 1152, height: 768 },
  "2:3": { width: 768, height: 1152 },
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["positivePrompt"],
  promptField: "positivePrompt", // Runware uses positivePrompt
  properties: {
    positivePrompt: {
      type: "string",
      title: "Prompt",
      default: "",
      description: "Describe the image you want to generate",
      maxLength: 2000,
      renderer: "prompt",
    },
    negativePrompt: {
      type: "string",
      title: "Negative Prompt",
      default: "",
      description: "Describe what to avoid in the image",
      maxLength: 2000,
      isAdvanced: true,
    },
    aspectRatio: {
      type: "string",
      title: "Aspect Ratio",
      default: "1:1",
      enum: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "3:2", "2:3"],
      enumLabels: {
        "1:1": "Square (1:1)",
        "16:9": "Landscape (16:9)",
        "9:16": "Portrait (9:16)",
        "4:3": "Standard (4:3)",
        "3:4": "Portrait (3:4)",
        "21:9": "Ultrawide (21:9)",
        "3:2": "Photo (3:2)",
        "2:3": "Portrait Photo (2:3)",
      },
      description: "Image dimensions",
    },
    numberResults: {
      type: "integer",
      title: "Number of Images",
      default: 1,
      minimum: 1,
      maximum: 4,
      description: "How many images to generate",
    },
    steps: {
      type: "integer",
      title: "Steps",
      default: 9,
      minimum: 1,
      maximum: 50,
      description: "Number of inference steps. More steps = better quality but slower.",
      isAdvanced: true,
    },
    CFGScale: {
      type: "number",
      title: "CFG Scale",
      default: 0,
      minimum: 0,
      maximum: 20,
      step: 0.5,
      description: "How closely to follow the prompt. 0 = automatic.",
      isAdvanced: true,
    },
    seed: {
      type: "integer",
      title: "Seed",
      default: -1,
      minimum: -1,
      maximum: 2147483647,
      description: "Random seed for reproducibility. -1 = random.",
      isAdvanced: true,
    },
    checkNSFW: {
      type: "boolean",
      title: "NSFW Check",
      default: true,
      description: "Check generated images for NSFW content",
      isAdvanced: true,
    },
  },
  "x-order": ["positivePrompt", "aspectRatio", "numberResults", "negativePrompt"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.positivePrompt || (typeof inputs.positivePrompt === "string" && inputs.positivePrompt.trim() === "")) {
    return { valid: false, error: "Prompt is required" };
  }
  if (typeof inputs.positivePrompt === "string" && inputs.positivePrompt.length > 2000) {
    return { valid: false, error: "Prompt must be 2000 characters or less" };
  }

  if (inputs.numberResults !== undefined) {
    const num = inputs.numberResults as number;
    if (num < 1 || num > 4) {
      return { valid: false, error: "Number of results must be between 1 and 4" };
    }
  }

  if (inputs.steps !== undefined) {
    const steps = inputs.steps as number;
    if (steps < 1 || steps > 50) {
      return { valid: false, error: "Steps must be between 1 and 50" };
    }
  }

  if (inputs.CFGScale !== undefined) {
    const cfg = inputs.CFGScale as number;
    if (cfg < 0 || cfg > 20) {
      return { valid: false, error: "CFG Scale must be between 0 and 20" };
    }
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION - Runware provider handles array wrapping
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  // Get dimensions from aspect ratio
  const aspectRatio = (inputs.aspectRatio || "1:1") as keyof typeof DIMENSION_PRESETS;
  const dimensions = DIMENSION_PRESETS[aspectRatio] || DIMENSION_PRESETS["1:1"];

  const task: Record<string, unknown> = {
    taskType: MODEL_CONFIG.taskType,
    model: MODEL_CONFIG.modelId,
    positivePrompt: inputs.positivePrompt || "",
    width: dimensions.width,
    height: dimensions.height,
    numberResults: inputs.numberResults || 1,
    outputFormat: MODEL_CONFIG.outputFormat,
    outputType: MODEL_CONFIG.outputType,
    includeCost: true,
  };

  // Optional parameters
  if (inputs.negativePrompt) task.negativePrompt = inputs.negativePrompt;
  if (inputs.steps !== undefined) task.steps = inputs.steps;
  if (inputs.CFGScale !== undefined) task.CFGScale = inputs.CFGScale;
  
  // Seed must be a valid positive integer (1 to 9223372036854775807) - only include if valid
  const seedValue = inputs.seed;
  if (seedValue !== undefined && seedValue !== null && seedValue !== '' && seedValue !== -1) {
    const seedNum = Number(seedValue);
    if (Number.isInteger(seedNum) && seedNum >= 1) {
      task.seed = seedNum;
    }
  }
  
  if (inputs.checkNSFW !== undefined) task.checkNSFW = inputs.checkNSFW;

  // Safety settings
  task.safety = { checkContent: false };

  // Return as object - Runware provider handles array wrapping
  return task;
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  const base = MODEL_CONFIG.baseCreditCost;
  const numResults = (inputs.numberResults || 1) as number;
  return Math.round(base * numResults * 100) / 100;
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, startPolling } = params;

  // Map prompt to positivePrompt
  const allInputs: Record<string, unknown> = {
    ...modelParameters,
    positivePrompt: modelParameters.positivePrompt || prompt,
  };

  const validation = validate(allInputs);
  if (!validation.valid) throw new Error(validation.error || "Validation failed");

  const cost = calculateCost(allInputs);
  await reserveCredits(userId, cost);

  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      prompt: allInputs.positivePrompt as string,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: getGenerationType(MODEL_CONFIG.contentType),
      status: GENERATION_STATUS.PROCESSING,
      tokens_used: cost,
      settings: sanitizeForStorage(modelParameters),
    })
    .select("id")
    .single();

  if (insertError || !generation) throw new Error(`Failed to create generation record: ${insertError?.message}`);

  const { error: functionError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: generation.id,
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      prompt: allInputs.positivePrompt,
      custom_parameters: preparePayload(allInputs),
      cost: cost,
      use_api_key: MODEL_CONFIG.use_api_key,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
    },
  });

  if (functionError) throw new Error(`Generation failed: ${functionError.message}`);

  startPolling(generation.id);
  return generation.id;
}
