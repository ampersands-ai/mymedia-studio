/**
 * Kling 2.6 Motion Control
 * 
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 * 
 * Transfer motion from video to image subject
 * - Endpoint: /api/v1/jobs/createTask (wrapper structure)
 * - Requires: image (input_urls array) + video (video_urls array)
 * - Optional: prompt
 * - Resolutions: 720p, 1080p
 * - Pricing per second: 720p=3, 1080p=4.5 credits
 * - Video duration: 3-30 seconds (10s max if character_orientation="image")
 * 
 * @locked
 * @model kling-2.6/motion-control
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
  modelId: "kling-2.6/motion-control",
  recordId: "d6e7f8a9-0b1c-2d3e-4f5a-6b7c8d9e0f1a",
  modelName: "Kling 2.6 Motion Control",
  provider: "kie_ai",
  contentType: "video_to_video",
  use_api_key: "KIE_AI_API_KEY_VIDEO_TO_VIDEO",
  baseCreditCost: 15, // Default: 720p × 5s = 3 × 5
  estimatedTimeSeconds: 180,
  pricingPerSecond: {
    "720p": 3,
    "1080p": 4.5,
  },
  maxDuration: {
    image: 10, // Max 10s when character_orientation="image"
    video: 30, // Max 30s when character_orientation="video"
  },
  minDuration: 3,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxVideos: 1,
  maxFileSize: 100 * 1024 * 1024, // 100MB for video
  defaultOutputs: 1,
  costMultipliers: null,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/kling.png",
  modelFamily: "Kling",
  variantName: "2.6 Motion Control",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/video_to_video/Kling_2_6_Motion_Control.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["input_urls", "video_urls", "character_orientation", "mode"],
  imageInputField: "input_urls",
  videoInputField: "video_urls",
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      default: "",
      description: "Optional text description of the desired output",
      maxLength: 2500,
      renderer: "prompt",
    },
    input_urls: {
      type: "array",
      title: "Subject Image",
      description: "Image of subject to animate. Must clearly show head, shoulders, and torso. Formats: JPEG, PNG, WebP (max 10MB)",
      renderer: "image",
      items: { type: "string", format: "uri" },
      minItems: 1,
      maxItems: 1,
    },
    video_urls: {
      type: "array",
      title: "Motion Video",
      description: "Video to extract motion from (3-30s). Must show head, shoulders, and torso. Min 720px width/height. Formats: MP4, MOV, MKV (max 100MB)",
      renderer: "video",
      items: { type: "string", format: "uri" },
      minItems: 1,
      maxItems: 1,
    },
    character_orientation: {
      type: "string",
      title: "Character Orientation",
      default: "video",
      enum: ["image", "video"],
      enumLabels: {
        image: "Match Image (max 10s output)",
        video: "Match Video (max 30s output)",
      },
      description: "Orientation of generated character",
    },
    mode: {
      type: "string",
      title: "Resolution",
      default: "720p",
      enum: ["720p", "1080p"],
      enumLabels: {
        "720p": "720p (3 credits/s)",
        "1080p": "1080p (4.5 credits/s)",
      },
      description: "Output video resolution",
    },
  },
  "x-order": ["prompt", "input_urls", "video_urls", "character_orientation", "mode"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.input_urls || !Array.isArray(inputs.input_urls) || inputs.input_urls.length === 0) {
    return { valid: false, error: "Subject image is required" };
  }

  if (!inputs.video_urls || !Array.isArray(inputs.video_urls) || inputs.video_urls.length === 0) {
    return { valid: false, error: "Motion video is required" };
  }

  if (!inputs.character_orientation) {
    return { valid: false, error: "Character orientation is required" };
  }

  if (!inputs.mode) {
    return { valid: false, error: "Resolution mode is required" };
  }

  if (inputs.prompt && typeof inputs.prompt === "string" && inputs.prompt.length > 2500) {
    return { valid: false, error: "Prompt must be 2500 characters or less" };
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    input_urls: inputs.input_urls || [],
    video_urls: inputs.video_urls || [],
    character_orientation: inputs.character_orientation || "video",
    mode: inputs.mode || "720p",
  };

  if (inputs.prompt) payload.prompt = inputs.prompt;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>, videoDuration?: number): number {
  const mode = (inputs.mode || "720p") as "720p" | "1080p";
  const orientation = (inputs.character_orientation || "video") as "image" | "video";
  
  // Get max duration based on orientation
  const maxDuration = MODEL_CONFIG.maxDuration[orientation];
  
  // Use provided duration or default estimate
  let duration = videoDuration || 5;
  duration = Math.min(duration, maxDuration);
  duration = Math.max(duration, MODEL_CONFIG.minDuration);

  const ratePerSecond = MODEL_CONFIG.pricingPerSecond[mode] || 3;
  return Math.ceil(ratePerSecond * duration * 10) / 10; // Round to 1 decimal
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, uploadedVideos, uploadedImages, uploadVideosToStorage, uploadImagesToStorage, startPolling } = params;

  const allInputs: Record<string, unknown> = { ...modelParameters };
  if (prompt) allInputs.prompt = prompt;

  // Upload image
  if (uploadedImages && uploadedImages.length > 0) {
    allInputs.input_urls = await uploadImagesToStorage(userId);
  }

  // Upload video
  if (uploadedVideos && uploadedVideos.length > 0 && uploadVideosToStorage) {
    allInputs.video_urls = await uploadVideosToStorage(userId);
  }

  const validation = validate(allInputs);
  if (!validation.valid) throw new Error(validation.error || "Validation failed");

  // TODO: Get actual video duration for accurate cost calculation
  const cost = calculateCost(allInputs);
  await reserveCredits(userId, cost);

  const description = (allInputs.prompt as string) || "Motion Control";

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
