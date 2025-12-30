/**
 * Seedance 1.5 Pro Text-to-Video
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * High-quality text-to-video generation with optional audio
 * - Endpoint: /api/v1/jobs/createTask (wrapper structure)
 * - Pure T2V: No image input
 * - Resolutions: 480p, 720p
 * - Durations: 4s, 8s, 12s
 * - Audio generation option (doubles cost)
 * - Fixed lens option for camera stability
 *
 * @locked
 * @model bytedance/seedance-1.5-pro
 * @provider kie.ai
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
  modelId: "bytedance/seedance-1.5-pro",
  recordId: "a1b2c3d4-5e6f-7a8b-9c0d-e1f2a3b4c5d6",
  modelName: "Seedance 1.5 Pro",
  provider: "kie_ai",
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
  baseCreditCost: 8, // Minimum: 480p, 4s, no audio
  estimatedTimeSeconds: 180,
  // Exact pricing lookup table (no audio)
  pricingTable: {
    "480p": { "4": 8, "8": 14, "12": 19 },
    "720p": { "4": 14, "8": 28, "12": 42 },
  },
  // Audio pricing table (with audio)
  audioPricingTable: {
    "480p": { "4": 14, "8": 28, "12": 38 },
    "720p": { "4": 28, "8": 56, "12": 84 },
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0, // T2V - no images
  defaultOutputs: 1,
  costMultipliers: null,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/seedream.png",
  modelFamily: "Seedance",
  variantName: "Seedance V1.5 Pro",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Seedance_1_5_Pro_T2V.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["prompt", "aspect_ratio", "duration"],
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      default: "",
      description: "Video description (3-1000 characters). Supports Chinese and English.",
      maxLength: 1000,
      minLength: 3,
      renderer: "prompt",
    },
    aspect_ratio: {
      type: "string",
      title: "Aspect Ratio",
      default: "16:9",
      enum: ["1:1", "21:9", "4:3", "3:4", "16:9", "9:16"],
      enumLabels: {
        "1:1": "Square (1:1)",
        "21:9": "Ultrawide (21:9)",
        "4:3": "Standard (4:3)",
        "3:4": "Portrait (3:4)",
        "16:9": "Widescreen (16:9)",
        "9:16": "Vertical (9:16)",
      },
      description: "Video frame dimensions",
    },
    resolution: {
      type: "string",
      title: "Resolution",
      default: "480p",
      enum: ["480p", "720p"],
      enumLabels: {
        "480p": "Standard (480p)",
        "720p": "High (720p)",
      },
      description: "Video resolution",
    },
    duration: {
      type: "string",
      title: "Duration",
      default: "4",
      enum: ["4", "8", "12"],
      enumLabels: {
        "4": "4 seconds",
        "8": "8 seconds",
        "12": "12 seconds",
      },
      description: "Video duration in seconds",
    },
    fixed_lens: {
      type: "boolean",
      title: "Fixed Camera",
      default: false,
      description: "Enable to keep camera static. Disable for dynamic movement.",
      isAdvanced: true,
    },
    generate_audio: {
      type: "boolean",
      title: "Generate Audio",
      default: false,
      description: "Create sound effects for the video (additional cost)",
    },
  },
  "x-order": ["prompt", "aspect_ratio", "duration", "resolution", "generate_audio"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.prompt || (typeof inputs.prompt === "string" && inputs.prompt.trim() === "")) {
    return { valid: false, error: "Prompt is required" };
  }
  if (typeof inputs.prompt === "string") {
    if (inputs.prompt.length > 1000) {
      return { valid: false, error: "Prompt must be 1000 characters or less" };
    }
    if (inputs.prompt.length < 3) {
      return { valid: false, error: "Prompt must be at least 3 characters" };
    }
  }

  if (!inputs.aspect_ratio) {
    return { valid: false, error: "Aspect ratio is required" };
  }

  if (!inputs.duration) {
    return { valid: false, error: "Duration is required" };
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    prompt: inputs.prompt || "",
    aspect_ratio: inputs.aspect_ratio || "16:9",
    duration: inputs.duration || "4",
  };

  if (inputs.resolution) payload.resolution = inputs.resolution;
  if (inputs.fixed_lens !== undefined) payload.fixed_lens = inputs.fixed_lens;
  if (inputs.generate_audio !== undefined) payload.generate_audio = inputs.generate_audio;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

// ============================================================================
// COST CALCULATION - EXACT PRICING TABLE
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  const resolution = (inputs.resolution || "480p") as "480p" | "720p";
  const duration = (inputs.duration || "4") as "4" | "8" | "12";
  const generateAudio = inputs.generate_audio === true;

  if (generateAudio) {
    return MODEL_CONFIG.audioPricingTable[resolution][duration];
  }

  return MODEL_CONFIG.pricingTable[resolution][duration];
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, startPolling } = params;

  const allInputs: Record<string, unknown> = { ...modelParameters, prompt };

  const validation = validate(allInputs);
  if (!validation.valid) throw new Error(validation.error || "Validation failed");

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

  if (insertError || !generation) throw new Error(`Failed to create generation record: ${insertError?.message}`);

  const { error: functionError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: generation.id,
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      prompt: prompt,
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

export default { MODEL_CONFIG, SCHEMA, preparePayload, calculateCost, validate, execute };
