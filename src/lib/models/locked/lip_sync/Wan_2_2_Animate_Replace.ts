/**
 * Wan 2.2 Animate Replace
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * Replace subject in video with image while preserving motion
 * - Endpoint: /api/v1/jobs/createTask (wrapper structure)
 * - Requires: video + image
 * - Resolutions: 480p, 580p, 720p
 * - Pricing per second: 480p=3, 580p=5, 720p=6.5 credits
 * - Max duration: 30 seconds
 *
 * @locked
 * @model wan/2-2-animate-replace
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
  modelId: "wan/2-2-animate-replace",
  recordId: "e4f5a6b7-1c2d-3e4f-5a6b-7c8d9e0f1a2b",
  modelName: "Wan 2.2 Animate Replace",
  provider: "kie_ai",
  contentType: "lip_sync",
  use_api_key: "KIE_AI_API_KEY_LIP_SYNC",
  baseCreditCost: 3, // Default: 480p × 5s = 3 × 5
  estimatedTimeSeconds: 180,
  pricingPerSecond: {
    "480p": 3,
    "580p": 5,
    "720p": 6.5,
  },
  maxDuration: 30, // seconds
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxVideos: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  costMultipliers: null,
  isPerSecondPricing: true,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/wan.png",
  modelFamily: "Wan",
  variantName: "Wan 2.2 Replace",
  displayOrderInFamily: 6,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/lip_sync/Wan_2_2_Animate_Replace.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["video_url", "image_url"],
  videoInputField: "video_url",
  imageInputField: "image_url",
  properties: {
    video_url: {
      type: "string",
      format: "uri",
      title: "Input Video",
      description: "Source video for motion reference. Formats: MP4, MOV, MKV (max 10MB, 30s max)",
      renderer: "video",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Replacement Image",
      description:
        "Image to replace subject in video. Will be resized/cropped to match aspect ratio. Formats: JPEG, PNG, WebP (max 10MB)",
      renderer: "image",
    },
    resolution: {
      type: "string",
      title: "Resolution",
      default: "480p",
      enum: ["480p", "580p", "720p"],
      enumLabels: {
        "480p": "480p (3 credits/s)",
        "580p": "580p (5 credits/s)",
        "720p": "720p (6.5 credits/s)",
      },
      description: "Output video resolution",
    },
  },
  "x-order": ["video_url", "image_url", "resolution"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.video_url || (typeof inputs.video_url === "string" && inputs.video_url.trim() === "")) {
    return { valid: false, error: "Input video is required" };
  }

  if (!inputs.image_url || (typeof inputs.image_url === "string" && inputs.image_url.trim() === "")) {
    return { valid: false, error: "Replacement image is required" };
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    video_url: inputs.video_url || "",
    image_url: inputs.image_url || "",
  };

  if (inputs.resolution) payload.resolution = inputs.resolution;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>, videoDuration?: number): number {
  const resolution = (inputs.resolution || "480p") as "480p" | "580p" | "720p";
  const duration = videoDuration || 5; // Default estimate if duration unknown

  const ratePerSecond = MODEL_CONFIG.pricingPerSecond[resolution] || 3;
  return Math.ceil(ratePerSecond * Math.min(duration, MODEL_CONFIG.maxDuration));
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const {
    userId,
    modelParameters,
    uploadedVideos,
    uploadedImages,
    uploadVideosToStorage,
    uploadImagesToStorage,
    startPolling,
  } = params;

  const allInputs: Record<string, unknown> = { ...modelParameters };

  // Upload video
  if (uploadedVideos && uploadedVideos.length > 0 && uploadVideosToStorage) {
    const videoUrls = await uploadVideosToStorage(userId);
    allInputs.video_url = videoUrls[0];
  }

  // Upload image
  if (uploadedImages && uploadedImages.length > 0) {
    const imageUrls = await uploadImagesToStorage(userId);
    allInputs.image_url = imageUrls[0];
  }

  const validation = validate(allInputs);
  if (!validation.valid) throw new Error(validation.error || "Validation failed");

  // TODO: Get actual video duration for accurate cost calculation
  const cost = calculateCost(allInputs);
  await reserveCredits(userId, cost);

  const description = "Animate Replace";

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
      userId: userId,
      modelId: MODEL_CONFIG.modelId,
      modelRecordId: MODEL_CONFIG.recordId,
      prompt: description,
      customParameters: preparePayload(allInputs),
      cost: cost,
      useApiKey: MODEL_CONFIG.use_api_key,
      modelConfig: MODEL_CONFIG,
      modelSchema: SCHEMA,
    },
  });

  if (functionError) throw new Error(`Generation failed: ${functionError.message}`);

  startPolling(generation.id);
  return generation.id;
}

export default { MODEL_CONFIG, SCHEMA, preparePayload, calculateCost, validate, execute };
