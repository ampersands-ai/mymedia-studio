/**
 * Runware ChatGPT Image 1.5 (Text-to-Image)
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * NEW PROVIDER: Runware (OpenAI via Runware)
 * - External endpoint: https://api.runware.ai/v1
 * - Payload: ARRAY of task objects (unique structure)
 * - Uses taskType: "imageInference"
 * - Uses positivePrompt (not prompt)
 * - Uses providerSettings.openai for quality and background
 * - Limited aspect ratios: 1:1, 2:3, 3:2 ONLY
 * - Quality tiers: low (1.5 credits), medium (5 credits), high (20 credits)
 *
 * @locked
 * @model openai:4@1
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
  modelId: "openai:4@1",
  recordId: "1a2b3c4d-5e6f-7a8b-9c0d-ef1234567890",
  modelName: "ChatGPT Image 1.5",
  provider: "runware",
  contentType: "prompt_to_image",
  use_api_key: "RUNWARE_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 1.5, // Low quality default
  estimatedTimeSeconds: 15,
  costMultipliers: {
    quality: { low: 1, medium: 3.33, high: 13.33 }, // 1.5, 5, 20 credits
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
  logoUrl: "/logos/openai.png",
  modelFamily: "OpenAI",
  variantName: "ChatGPT Image 1.5",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Runware_ChatGPT_Image_15.ts",
} as const;

// ============================================================================
// PRESET DIMENSIONS - LIMITED TO 3 ASPECT RATIOS
// ============================================================================

const DIMENSION_PRESETS = {
  "1:1": { width: 1024, height: 1024 },
  "2:3": { width: 1024, height: 1536 },
  "3:2": { width: 1536, height: 1024 },
} as const;

// ============================================================================
// QUALITY CREDIT COSTS
// ============================================================================

const QUALITY_COSTS = {
  low: 1.5,
  medium: 5,
  high: 20,
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
    aspectRatio: {
      type: "string",
      title: "Aspect Ratio",
      default: "1:1",
      enum: ["1:1", "2:3", "3:2"],
      enumLabels: {
        "1:1": "Square (1:1)",
        "2:3": "Portrait (2:3)",
        "3:2": "Landscape (3:2)",
      },
      description: "Image dimensions (limited options)",
    },
    quality: {
      type: "string",
      title: "Quality",
      default: "medium",
      enum: ["low", "medium", "high"],
      enumLabels: {
        low: "Low (1.5 credits)",
        medium: "Medium (5 credits)",
        high: "High (20 credits)",
      },
      description: "Image quality tier - affects credit cost",
    },
    background: {
      type: "string",
      title: "Background",
      default: "opaque",
      enum: ["opaque", "transparent"],
      enumLabels: {
        opaque: "Opaque",
        transparent: "Transparent",
      },
      showToUser: false,
      description: "Background type",
      isAdvanced: true,
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
  "x-order": ["positivePrompt", "aspectRatio", "quality"],
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

  // Validate aspect ratio - only 3 options allowed
  const aspectRatio = inputs.aspectRatio as string | undefined;
  if (aspectRatio && !["1:1", "2:3", "3:2"].includes(aspectRatio)) {
    return { valid: false, error: "Aspect ratio must be 1:1, 2:3, or 3:2" };
  }

  // Validate quality
  const quality = inputs.quality as string | undefined;
  if (quality && !["low", "medium", "high"].includes(quality)) {
    return { valid: false, error: "Quality must be low, medium, or high" };
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

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  // Get dimensions from aspect ratio (limited to 3 options)
  const aspectRatio = (inputs.aspectRatio || "1:1") as keyof typeof DIMENSION_PRESETS;
  const dimensions = DIMENSION_PRESETS[aspectRatio] || DIMENSION_PRESETS["1:1"];

  const quality = (inputs.quality || "medium") as keyof typeof QUALITY_COSTS;
  const background = (inputs.background || "opaque") as string;

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
    // OpenAI-specific settings
    providerSettings: {
      openai: {
        quality,
        background,
      },
    },
  };

  // Seed must be a valid positive integer
  const seedValue = inputs.seed;
  if (seedValue !== undefined && seedValue !== null && seedValue !== "") {
    const seedNum = Number(seedValue);
    if (Number.isInteger(seedNum) && seedNum >= 1 && seedNum <= Number.MAX_SAFE_INTEGER) {
      task.seed = seedNum;
    }
  }

  return task;
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  const quality = (inputs.quality || "medium") as keyof typeof QUALITY_COSTS;
  const baseCost = QUALITY_COSTS[quality] || QUALITY_COSTS.medium;
  const numResults = (inputs.numberResults || 1) as number;
  return Math.round(baseCost * numResults * 100) / 100;
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
