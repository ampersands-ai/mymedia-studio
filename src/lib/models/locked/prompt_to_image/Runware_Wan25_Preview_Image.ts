/**
 * Runware Wan2.5-Preview Image (Text-to-Image)
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * NEW PROVIDER: Runware (NOT KIE.AI)
 * - External endpoint: https://api.runware.ai/v1
 * - Payload: ARRAY of task objects (unique structure)
 * - Uses taskType: "imageInference"
 * - Uses positivePrompt (not prompt)
 * - Width/height instead of aspect_ratio
 * - Wan2.5: Alibaba's image model - minimal parameters
 * - Note: Does NOT use steps, CFGScale, scheduler, checkNSFW, outputQuality
 *
 * @locked
 * @model runware:201@10
 * @provider runware
 * @version 1.0.0
 */

import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

export const MODEL_CONFIG = {
  modelId: "runware:201@10",
  recordId: "4d5e6f7a-8b9c-0d1e-2f3a-123456789012",
  modelName: "Wan 2.5 Preview",
  provider: "runware",
  contentType: "prompt_to_image",
  use_api_key: "RUNWARE_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 2.75,
  estimatedTimeSeconds: 15,
  costMultipliers: {
    numberResults: { 1: 1, 2: 2, 3: 3, 4: 4 },
  },
  apiEndpoint: "https://api.runware.ai/v1",
  payloadStructure: "array",
  maxImages: 0, // T2I - no input images
  defaultOutputs: 1,
  // Runware-specific
  taskType: "imageInference",
  outputFormat: "JPEG",
  outputType: ["URL"],
  // UI metadata
  isActive: true,
  logoUrl: "/logos/wan.png",
  modelFamily: "Wan",
  variantName: "Wan 2.5 Preview",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Runware_Wan25_Preview_Image.ts",
} as const;

// ============================================================================
// PRESET DIMENSIONS
// ============================================================================

const DIMENSION_PRESETS = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "4:3": { width: 1280, height: 960 },
  "3:4": { width: 960, height: 1280 },
  "21:9": { width: 1536, height: 640 },
  "3:2": { width: 1280, height: 848 },
  "2:3": { width: 848, height: 1280 },
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["positivePrompt"],
  promptField: "positivePrompt",
  properties: {
    positivePrompt: {
      type: "string",
      title: "Prompt",
      default: "",
      description: "Describe the image you want to generate",
      maxLength: 2000,
      renderer: "prompt",
    },
    width: {
      type: "integer",
      title: "Width",
      minimum: 128,
      maximum: 2048,
      showToUser: false,
      description: "Image width (multiple of 16)",
      isAdvanced: true,
    },
    height: {
      type: "integer",
      title: "Height",
      minimum: 128,
      maximum: 2048,
      showToUser: false,
      description: "Image height (multiple of 16)",
      isAdvanced: true,
    },
    aspectRatio: {
      type: "string",
      title: "Aspect Ratio",
      default: "3:4",
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
      maximum: 1,
      showToUser: false,
      description: "How many images to generate",
    },
    seed: {
      type: "integer",
      title: "Seed",
      minimum: 1,
      maximum: Number.MAX_SAFE_INTEGER,
      showToUser: false,
      description: "Random seed for reproducibility. Leave blank for random.",
      isAdvanced: true,
    },
  },
  "x-order": ["positivePrompt", "aspectRatio", "numberResults"],
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

  if (inputs.seed !== undefined && inputs.seed !== null && inputs.seed !== "") {
    const seedNum = Number(inputs.seed);
    if (seedNum <= 0) {
      return { valid: true };
    }
    if (!Number.isInteger(seedNum) || seedNum > Number.MAX_SAFE_INTEGER) {
      return { valid: false, error: `Seed must be an integer between 1 and ${Number.MAX_SAFE_INTEGER}` };
    }
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION - Runware provider handles array wrapping
// ============================================================================

function normalizeDimension(value: number): number {
  const clamped = Math.max(128, Math.min(2048, value));
  return Math.round(clamped / 16) * 16;
}

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  // Get dimensions: use explicit width/height if provided, otherwise derive from aspectRatio
  let width: number;
  let height: number;

  if (inputs.width !== undefined && inputs.height !== undefined) {
    width = normalizeDimension(Number(inputs.width));
    height = normalizeDimension(Number(inputs.height));
  } else {
    const aspectRatio = (inputs.aspectRatio || "3:4") as keyof typeof DIMENSION_PRESETS;
    const dimensions = DIMENSION_PRESETS[aspectRatio] || DIMENSION_PRESETS["3:4"];
    width = dimensions.width;
    height = dimensions.height;
  }

  const task: Record<string, unknown> = {
    taskType: MODEL_CONFIG.taskType,
    model: MODEL_CONFIG.modelId,
    positivePrompt: inputs.positivePrompt || "",
    width,
    height,
    numberResults: inputs.numberResults || 1,
    outputFormat: MODEL_CONFIG.outputFormat,
    outputType: MODEL_CONFIG.outputType,
    includeCost: true,
  };

  // Seed must be a valid positive integer
  const seedValue = inputs.seed;
  if (seedValue !== undefined && seedValue !== null && seedValue !== "") {
    const seedNum = Number(seedValue);
    if (Number.isInteger(seedNum) && seedNum >= 1 && seedNum <= Number.MAX_SAFE_INTEGER) {
      task.seed = seedNum;
    }
  }

  // Note: Wan2.5 does NOT use steps, CFGScale, scheduler, checkNSFW, outputQuality, safety

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
  const { prompt, modelParameters, userId, startPolling } = params;

  const inputs: Record<string, unknown> = {
    ...modelParameters,
    positivePrompt: prompt,
  };

  const validation = validate(inputs);
  if (!validation.valid) throw new Error(validation.error);

  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);

  const { data: gen, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: getGenerationType(MODEL_CONFIG.contentType),
      prompt,
      tokens_used: cost,
      status: GENERATION_STATUS.PENDING,
      settings: sanitizeForStorage(modelParameters),
    })
    .select()
    .single();

  if (error || !gen) throw new Error(`Failed to create generation: ${error?.message}`);

  const { error: funcError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt: inputs.positivePrompt,
      custom_parameters: preparePayload(inputs),
    },
  });

  if (funcError) {
    await supabase.from("generations").update({ status: GENERATION_STATUS.FAILED }).eq("id", gen.id);
    const errorMessage = await extractEdgeFunctionError(funcError);
    throw new Error(errorMessage);
  }

  startPolling(gen.id);
  return gen.id;
}
