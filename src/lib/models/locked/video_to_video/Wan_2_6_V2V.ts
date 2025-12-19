/**
 * Wan 2.6 Video-to-Video
 * 
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 * 
 * Video-to-video generation (style transfer/transformation)
 * - Endpoint: /api/v1/jobs/createTask (wrapper structure)
 * - Video field: video_urls (ARRAY)
 * - Supports Chinese and English prompts
 * - Duration: 5 or 10 seconds ONLY (NOT 15)
 * - Resolution: 720p or 1080p
 * - Accepted video formats: MP4, MOV, MKV
 * 
 * NEW CONTENT TYPE: video_to_video
 * 
 * @locked
 * @model wan/2-6-video-to-video
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
  modelId: "wan/2-6-video-to-video",
  recordId: "g2b3c4d5-6e7f-8a9b-0c1d-2e3f4a5b6c7d",
  modelName: "Wan 2.6",
  provider: "kie_ai",
  contentType: "video_to_video", // NEW CONTENT TYPE
  use_api_key: "KIE_AI_API_KEY_VIDEO_TO_VIDEO",
  baseCreditCost: 10,
  estimatedTimeSeconds: 240,
  costMultipliers: {
    duration: { "5": 1, "10": 2 }, // Only 5 or 10 seconds for V2V
    resolution: { "720p": 1, "1080p": 2 },
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
  logoUrl: "/logos/wan.png",
  modelFamily: "Wan",
  variantName: "2.6 Video-to-Video",
  displayOrderInFamily: 3,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/video_to_video/Wan_2_6_V2V.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["prompt", "video_urls"],
  videoInputField: "video_urls", // ARRAY field for video input
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      default: "",
      description: "Describe how to transform the video. Supports Chinese and English.",
      maxLength: 5000,
      minLength: 2,
      renderer: "prompt",
    },
    video_urls: {
      type: "array",
      title: "Input Video",
      description: "Video to transform. Accepted: MP4, MOV, MKV. Max 10MB.",
      renderer: "video",
      items: { type: "string", format: "uri" },
      minItems: 1,
      maxItems: 1,
    },
    duration: {
      type: "string",
      title: "Duration",
      default: "5",
      enum: ["5", "10"], // V2V only supports 5 or 10 seconds
      enumLabels: {
        "5": "5 seconds",
        "10": "10 seconds",
      },
      description: "Output video duration in seconds",
    },
    resolution: {
      type: "string",
      title: "Resolution",
      default: "720p",
      enum: ["720p", "1080p"],
      enumLabels: {
        "720p": "720p (HD)",
        "1080p": "1080p (Full HD)",
      },
      description: "Output video resolution",
    },
  },
  "x-order": ["prompt", "video_urls", "duration", "resolution"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.prompt || (typeof inputs.prompt === "string" && inputs.prompt.trim() === "")) {
    return { valid: false, error: "Prompt is required" };
  }
  if (typeof inputs.prompt === "string" && inputs.prompt.length > 5000) {
    return { valid: false, error: "Prompt must be 5000 characters or less" };
  }
  if (typeof inputs.prompt === "string" && inputs.prompt.length < 2) {
    return { valid: false, error: "Prompt must be at least 2 characters" };
  }

  if (!inputs.video_urls || !Array.isArray(inputs.video_urls) || inputs.video_urls.length === 0) {
    return { valid: false, error: "Input video is required" };
  }

  // Validate duration is only 5 or 10 for V2V
  if (inputs.duration && inputs.duration !== "5" && inputs.duration !== "10") {
    return { valid: false, error: "Duration must be 5 or 10 seconds for video-to-video" };
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    prompt: inputs.prompt || "",
    video_urls: inputs.video_urls || [],
  };

  if (inputs.duration) payload.duration = inputs.duration;
  if (inputs.resolution) payload.resolution = inputs.resolution;

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
  const duration = (inputs.duration || "5") as keyof typeof MODEL_CONFIG.costMultipliers.duration;
  const resolution = (inputs.resolution || "720p") as keyof typeof MODEL_CONFIG.costMultipliers.resolution;

  const durMult = MODEL_CONFIG.costMultipliers.duration[duration] || 1;
  const resMult = MODEL_CONFIG.costMultipliers.resolution[resolution] || 1;

  return Math.round(base * durMult * resMult * 100) / 100;
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, startPolling } = params;

  // For video_to_video models, video_urls comes from modelParameters (pre-uploaded)
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
      generation_id: generation.id,
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
