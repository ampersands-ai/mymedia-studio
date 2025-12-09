/**
 * Runway Text-to-Video Model
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * CRITICAL FIXES APPLIED:
 * - Endpoint: /api/v1/runway/generate (NOT /api/v1/jobs/createTask)
 * - Payload: FLAT structure (NOT wrapper)
 * - modelId: Fixed typo (was "runway-duration-5-generate model")
 * - Added: quality (REQUIRED), aspectRatio (REQUIRED for T2V), waterMark
 * - Prompt maxLength: 1800 (NOT 5000)
 * - Duration: numbers 5/10 (NOT strings)
 * - CONSTRAINT: 10s + 1080p = NOT ALLOWED
 *
 * @locked
 * @model runway/text-to-video
 * @provider kie.ai
 * @version 2.0.0
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
  modelId: "runway-duration-5-generate", // CORRECTED: Was "runway-duration-5-generate model"
  recordId: "7bde9fb9-b16b-47b0-86a7-c0762a1a58e3",
  modelName: "Runway",
  provider: "kie_ai",
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
  baseCreditCost: 6,
  estimatedTimeSeconds: 300,
  costMultipliers: {
    duration: { 5: 1, 10: 2.5 },
    quality: { "720p": 1, "1080p": 2.5 },
  },
  apiEndpoint: "/api/v1/runway/generate", // CORRECTED: Was /api/v1/jobs/createTask
  payloadStructure: "flat", // CORRECTED: Was wrapper
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/runway.png",
  modelFamily: "Runway",
  variantName: "Runway",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Runway_T2V.ts",
} as const;

// ============================================================================
// SCHEMA - CORRECTED TO MATCH API
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["prompt", "duration", "quality", "aspectRatio"],
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      default: "",
      description:
        "Descriptive text that guides the AI video generation. Be specific about subject, action, style, and setting.",
      maxLength: 1800, // CORRECTED: Was 5000
      renderer: "prompt",
    },
    aspectRatio: {
      type: "string",
      title: "Aspect Ratio",
      default: "16:9",
      enum: ["16:9", "4:3", "1:1", "3:4", "9:16"],
      enumLabels: {
        "16:9": "Landscape (16:9)",
        "4:3": "Standard (4:3)",
        "1:1": "Square (1:1)",
        "3:4": "Portrait (3:4)",
        "9:16": "Vertical (9:16)",
      },
      description: "Required for text-to-video generation.",
    },
    duration: {
      type: "number", // CORRECTED: Was string
      title: "Duration",
      default: 5,
      enum: [5, 10],
      enumLabels: {
        5: "5 seconds",
        10: "10 seconds (720p only)",
      },
      description: "Video duration. 10s cannot use 1080p quality.",
    },
    quality: {
      type: "string",
      title: "Quality",
      default: "720p",
      enum: ["720p", "1080p"],
      enumLabels: {
        "720p": "720p (HD)",
        "1080p": "1080p (Full HD, 5s only)",
      },
      description: "Video resolution. 1080p cannot generate 10s videos.",
    },
    waterMark: {
      type: "string",
      title: "Watermark",
      default: "",
      description: "Watermark text. Empty = no watermark.",
      isAdvanced: true,
    },
  },
  "x-order": ["prompt", "aspectRatio", "duration", "quality"],
});

// ============================================================================
// VALIDATION - WITH 10s + 1080p CONSTRAINT
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.prompt || (typeof inputs.prompt === "string" && inputs.prompt.trim() === "")) {
    return { valid: false, error: "Prompt is required" };
  }
  if (typeof inputs.prompt === "string" && inputs.prompt.length > 1800) {
    return { valid: false, error: "Prompt must be 1800 characters or less" };
  }

  // CRITICAL CONSTRAINT: 10s + 1080p = NOT ALLOWED
  const duration = inputs.duration || 5;
  const quality = inputs.quality || "720p";
  if (duration === 10 && quality === "1080p") {
    return { valid: false, error: "10-second videos cannot use 1080p resolution. Use 720p or reduce duration to 5s." };
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION - FLAT STRUCTURE (NO WRAPPER)
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    prompt: inputs.prompt || "",
    aspectRatio: inputs.aspectRatio || "16:9", // REQUIRED for T2V
    duration: inputs.duration || 5,
    quality: inputs.quality || "720p",
  };

  if (inputs.waterMark !== undefined && inputs.waterMark !== "") {
    payload.waterMark = inputs.waterMark;
  }

  return payload;
}

// ============================================================================
// COST CALCULATION - WITH DURATION AND QUALITY MULTIPLIERS
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  const base = MODEL_CONFIG.baseCreditCost;
  const duration = (inputs.duration || 5) as keyof typeof MODEL_CONFIG.costMultipliers.duration;
  const quality = (inputs.quality || "720p") as keyof typeof MODEL_CONFIG.costMultipliers.quality;

  const durMult = MODEL_CONFIG.costMultipliers.duration[duration] || 1;
  const qualMult = MODEL_CONFIG.costMultipliers.quality[quality] || 1;

  return Math.round(base * durMult * qualMult * 100) / 100;
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, startPolling } = params;

  const allInputs: Record<string, unknown> = { ...modelParameters, prompt };

  const validation = validate(allInputs);
  if (!validation.valid) {
    throw new Error(validation.error || "Validation failed");
  }

  const cost = calculateCost(allInputs);

  await reserveCredits(userId, cost);

  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      prompt: prompt,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: getGenerationType(MODEL_CONFIG.contentType),
      status: GENERATION_STATUS.PROCESSING,
      tokens_used: cost,
      settings: sanitizeForStorage(modelParameters),
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    throw new Error(`Failed to create generation record: ${insertError?.message}`);
  }

  const generationId = generation.id;

  const { error: functionError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: generationId,
      userId: userId,
      modelId: MODEL_CONFIG.modelId,
      modelRecordId: MODEL_CONFIG.recordId,
      prompt: prompt,
      custom_parameters: preparePayload(allInputs),
      cost: cost,
      use_api_key: MODEL_CONFIG.use_api_key,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
    },
  });

  if (functionError) {
    throw new Error(`Generation failed: ${functionError.message}`);
  }

  startPolling(generationId);

  return generationId;
}

export default {
  MODEL_CONFIG,
  SCHEMA,
  preparePayload,
  calculateCost,
  validate,
  execute,
};
