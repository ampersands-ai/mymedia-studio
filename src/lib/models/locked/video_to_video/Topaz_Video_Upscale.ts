/**
 * Topaz Video Upscale
 * 
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 * 
 * AI-powered video upscaling
 * - Endpoint: /api/v1/jobs/createTask (wrapper structure)
 * - Video field: video_url (STRING, not array)
 * - Upscale factors: 1x, 2x, 4x
 * - Accepted video formats: MP4, MOV, MKV
 * - Max file size: 10MB
 * 
 * Content type: video_to_video
 * 
 * @locked
 * @model topaz/video-upscale
 * @provider primary
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
  modelId: "topaz/video-upscale",
  recordId: "f1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
  modelName: "Topaz Video Upscale",
  provider: "kie_ai",
  contentType: "video_to_video",
  use_api_key: "KIE_AI_API_KEY_VIDEO_TO_VIDEO",
  baseCreditCost: 5,
  estimatedTimeSeconds: 300,
  costMultipliers: {
    upscale_factor: { "1": 1, "2": 2, "4": 4 },
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: null,
  maxVideos: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  acceptedVideoTypes: ["video/mp4", "video/quicktime", "video/x-matroska"],
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/topaz.png",
  modelFamily: "Topaz",
  variantName: "Video Upscale",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/video_to_video/Topaz_Video_Upscale.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["video_url"],
  videoInputField: "video_url", // STRING field (not array)
  properties: {
    video_url: {
      type: "string",
      format: "uri",
      title: "Input Video",
      description: "Video to upscale. Accepted: MP4, MOV, MKV. Max 10MB.",
      renderer: "video",
    },
    upscale_factor: {
      type: "string",
      title: "Upscale Factor",
      default: "2",
      enum: ["1", "2", "4"],
      enumLabels: {
        "1": "1x (Original)",
        "2": "2x (Double resolution)",
        "4": "4x (Quadruple resolution)",
      },
      description: "Factor to upscale video. 2x doubles width and height.",
    },
  },
  "x-order": ["video_url", "upscale_factor"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.video_url || (typeof inputs.video_url === "string" && inputs.video_url.trim() === "")) {
    return { valid: false, error: "Input video is required" };
  }

  // Validate upscale_factor if provided
  if (inputs.upscale_factor && !["1", "2", "4"].includes(inputs.upscale_factor as string)) {
    return { valid: false, error: "Upscale factor must be 1, 2, or 4" };
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    video_url: inputs.video_url || "",
  };

  if (inputs.upscale_factor) payload.upscale_factor = inputs.upscale_factor;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  const base = MODEL_CONFIG.baseCreditCost;
  const factor = (inputs.upscale_factor || "2") as keyof typeof MODEL_CONFIG.costMultipliers.upscale_factor;
  const factorMult = MODEL_CONFIG.costMultipliers.upscale_factor[factor] || 2;

  return Math.round(base * factorMult * 100) / 100;
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, modelParameters, startPolling } = params;

  // For video_to_video models, video_url comes from modelParameters (pre-uploaded)
  const allInputs: Record<string, unknown> = { ...modelParameters };

  const validation = validate(allInputs);
  if (!validation.valid) throw new Error(validation.error || "Validation failed");

  const cost = calculateCost(allInputs);
  await reserveCredits(userId, cost);

  // Generate a description for the upscale operation
  const factor = allInputs.upscale_factor || "2";
  const description = `Video upscale ${factor}x`;

  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      prompt: description,
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
      prompt: description,
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
