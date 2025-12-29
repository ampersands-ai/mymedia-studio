/**
 * Runware Seedance 1.0 Pro Fast (Text-to-Video)
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * NEW PROVIDER: Runware (ByteDance via Runware)
 * - External endpoint: https://api.runware.ai/v1
 * - Payload: ARRAY of task objects (unique structure)
 * - Uses taskType: "videoInference" (NOT imageInference)
 * - Uses positivePrompt (not prompt)
 * - Uses providerSettings.bytedance for camera settings
 * - Width/height with video-specific dimensions
 * - Has fps and duration parameters
 *
 * @locked
 * @model bytedance:2@2
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
  modelId: "bytedance:2@2",
  recordId: "b2c3d4e5-f6a7-1b2c-3d4e-5f6a7b8c9d0e",
  modelName: "Seedance 1.0 Pro Fast",
  provider: "runware",
  contentType: "prompt_to_video",
  use_api_key: "RUNWARE_API_KEY_VIDEO",
  baseCreditCost: 3.5,
  estimatedTimeSeconds: 60,
  costMultipliers: {
    duration: { 4: 1, 8: 2, 12: 3 },
  },
  apiEndpoint: "https://api.runware.ai/v1",
  payloadStructure: "array",
  maxImages: 0, // T2V - no input images
  defaultOutputs: 1,
  // Runware-specific
  taskType: "videoInference",
  outputFormat: "mp4",
  outputQuality: 85,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/seedance.png",
  modelFamily: "Seedance",
  variantName: "Seedance V1 Pro Fast",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Runware_Seedance_Pro_Fast_T2V.ts",
} as const;

// ============================================================================
// PRESET DIMENSIONS - VIDEO SPECIFIC
// ============================================================================

const DIMENSION_PRESETS = {
  "9:16": { width: 544, height: 736 },
  "16:9": { width: 736, height: 544 },
  "1:1": { width: 640, height: 640 },
  "4:3": { width: 640, height: 480 },
  "3:4": { width: 480, height: 640 },
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
      description: "Describe the video you want to generate",
      maxLength: 2000,
      renderer: "prompt",
    },
    aspectRatio: {
      type: "string",
      title: "Aspect Ratio",
      default: "9:16",
      enum: ["9:16", "16:9", "1:1", "4:3", "3:4"],
      enumLabels: {
        "9:16": "Portrait (9:16)",
        "16:9": "Landscape (16:9)",
        "1:1": "Square (1:1)",
        "4:3": "Standard (4:3)",
        "3:4": "Portrait (3:4)",
      },
      description: "Video dimensions",
    },
    duration: {
      type: "integer",
      title: "Duration (seconds)",
      default: 4,
      enum: [4, 8, 12],
      enumLabels: {
        4: "4 seconds",
        8: "8 seconds",
        12: "12 seconds",
      },
      description: "Video length in seconds",
    },
    fps: {
      type: "integer",
      title: "Frame Rate",
      default: 24,
      enum: [24, 30],
      enumLabels: {
        24: "24 fps (cinematic)",
        30: "30 fps (smooth)",
      },
      showToUser: false,
      description: "Frames per second",
      isAdvanced: true,
    },
    cameraFixed: {
      type: "boolean",
      title: "Fixed Camera",
      default: false,
      showToUser: false,
      description: "Keep camera position fixed during video",
      isAdvanced: true,
    },
    width: {
      type: "integer",
      title: "Width",
      minimum: 128,
      maximum: 1280,
      showToUser: false,
      description: "Video width",
      isAdvanced: true,
    },
    height: {
      type: "integer",
      title: "Height",
      minimum: 128,
      maximum: 1280,
      showToUser: false,
      description: "Video height",
      isAdvanced: true,
    },
    outputQuality: {
      type: "integer",
      title: "Output Quality",
      default: 85,
      minimum: 20,
      maximum: 99,
      showToUser: false,
      description: "Video compression quality",
      isAdvanced: true,
    },
    numberResults: {
      type: "integer",
      title: "Number of Videos",
      default: 1,
      minimum: 1,
      maximum: 1,
      showToUser: false,
      description: "How many videos to generate",
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
  "x-order": ["positivePrompt", "aspectRatio", "duration"],
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

  // Validate duration
  const duration = inputs.duration as number | undefined;
  if (duration && ![4, 8, 12].includes(duration)) {
    return { valid: false, error: "Duration must be 4, 8, or 12 seconds" };
  }

  // Validate fps
  const fps = inputs.fps as number | undefined;
  if (fps && ![24, 30].includes(fps)) {
    return { valid: false, error: "FPS must be 24 or 30" };
  }

  if (inputs.outputQuality !== undefined) {
    const quality = inputs.outputQuality as number;
    if (quality < 20 || quality > 99) {
      return { valid: false, error: "Output quality must be between 20 and 99" };
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
  // Get dimensions: use explicit width/height if provided, otherwise derive from aspectRatio
  let width: number;
  let height: number;

  if (inputs.width !== undefined && inputs.height !== undefined) {
    width = Number(inputs.width);
    height = Number(inputs.height);
  } else {
    const aspectRatio = (inputs.aspectRatio || "9:16") as keyof typeof DIMENSION_PRESETS;
    const dimensions = DIMENSION_PRESETS[aspectRatio] || DIMENSION_PRESETS["9:16"];
    width = dimensions.width;
    height = dimensions.height;
  }

  const task: Record<string, unknown> = {
    taskType: MODEL_CONFIG.taskType,
    model: MODEL_CONFIG.modelId,
    positivePrompt: inputs.positivePrompt || "",
    width,
    height,
    duration: inputs.duration || 4,
    fps: inputs.fps || 24,
    numberResults: inputs.numberResults || 1,
    outputFormat: MODEL_CONFIG.outputFormat,
    outputQuality: inputs.outputQuality ?? MODEL_CONFIG.outputQuality,
    includeCost: true,
    // ByteDance-specific settings
    providerSettings: {
      bytedance: {
        cameraFixed: inputs.cameraFixed ?? false,
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
  const base = MODEL_CONFIG.baseCreditCost;
  const duration = (inputs.duration || 4) as number;
  const durationMultiplier = duration / 4; // 4s = 1x, 8s = 2x, 12s = 3x
  const numResults = (inputs.numberResults || 1) as number;
  return Math.round(base * durationMultiplier * numResults * 100) / 100;
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
