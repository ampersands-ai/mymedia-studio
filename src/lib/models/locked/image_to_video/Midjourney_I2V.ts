/**
 * Midjourney Image-to-Video Model
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * CRITICAL FIXES APPLIED:
 * - Endpoint: /api/v1/mj/generate (NOT /api/v1/jobs/createTask)
 * - Payload: FLAT structure (NOT wrapper)
 * - Image field: fileUrls array with maxItems: 1 (NOT image_url string)
 * - Added: taskType: "mj_video", aspectRatio
 * - Removed: speed (NOT required for video per API docs)
 * - Removed: version, stylization, variety, weirdness (NOT applicable for video)
 *
 * @locked
 * @model midjourney/image-to-video
 * @provider primary
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
  modelId: "midjourney/image-to-video",
  recordId: "e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b",
  modelName: "Midjourney",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 15,
  estimatedTimeSeconds: 120,
  costMultipliers: null, // No multipliers for video
  apiEndpoint: "/api/v1/mj/generate", // CORRECTED: Was /api/v1/jobs/createTask
  payloadStructure: "flat", // CORRECTED: Was wrapper
  maxImages: 1, // ONLY one image for video generation
  maxFileSize: 10 * 1024 * 1024,
  defaultOutputs: 1,
  isActive: true,
  logoUrl: "/logos/midjourney.png",
  modelFamily: "Midjourney",
  variantName: "Midjourney",
  displayOrderInFamily: 3,
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Midjourney_I2V.ts",
} as const;

// ============================================================================
// SCHEMA - CORRECTED TO MATCH API
// Note: Video generation does NOT use speed, version, stylization, variety, weirdness
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["prompt", "fileUrls"],
  imageInputField: "fileUrls", // CORRECTED: Was image_url
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      default: "",
      description: "Text prompt describing the desired video motion and content",
      maxLength: 2000,
      renderer: "prompt",
    },
    fileUrls: {
      type: "array",
      title: "Input Image",
      description: "Single image to animate (only one image supported for video)",
      renderer: "image",
      items: { type: "string", format: "uri" },
      minItems: 1,
      maxItems: 1, // CRITICAL: Only 1 image for video
    },
    aspectRatio: {
      type: "string",
      title: "Aspect Ratio",
      default: "16:9",
      enum: ["1:2", "9:16", "2:3", "3:4", "5:6", "6:5", "4:3", "3:2", "1:1", "16:9", "2:1"],
      enumLabels: {
        "1:2": "Tall (1:2)",
        "9:16": "Portrait (9:16)",
        "2:3": "Portrait (2:3)",
        "3:4": "Portrait (3:4)",
        "5:6": "Portrait (5:6)",
        "6:5": "Landscape (6:5)",
        "4:3": "Landscape (4:3)",
        "3:2": "Landscape (3:2)",
        "1:1": "Square (1:1)",
        "16:9": "Widescreen (16:9)",
        "2:1": "Ultra Wide (2:1)",
      },
    },
    waterMark: {
      type: "string",
      title: "Watermark",
      showToUser: false,
      description: "Optional watermark text to add to generated video",
    },
  },
  "x-order": ["prompt", "fileUrls", "aspectRatio"],
});

// ============================================================================
// PAYLOAD PREPARATION - FLAT STRUCTURE WITH taskType
// Note: speed is NOT required for mj_video per API docs
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    taskType: "mj_video", // REQUIRED for video
    prompt: inputs.prompt || "",
    fileUrls: inputs.fileUrls || [],
    aspectRatio: inputs.aspectRatio || "16:9",
  };

  // Note: speed, version, stylization, variety, weirdness are NOT applicable for video

  if (inputs.waterMark) {
    payload.waterMark = inputs.waterMark;
  }

  return payload;
}

// ============================================================================
// COST CALCULATION - FIXED COST FOR VIDEO
// ============================================================================

export function calculateCost(_inputs: Record<string, unknown>): number {
  return MODEL_CONFIG.baseCreditCost;
}

// ============================================================================
// VALIDATION - CORRECTED FOR fileUrls ARRAY WITH MAX 1 IMAGE
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.prompt || (typeof inputs.prompt === "string" && inputs.prompt.trim() === "")) {
    return { valid: false, error: "Prompt is required" };
  }
  if (typeof inputs.prompt === "string" && inputs.prompt.length > 2000) {
    return { valid: false, error: "Prompt must be 2000 characters or less" };
  }

  if (!inputs.fileUrls || !Array.isArray(inputs.fileUrls) || inputs.fileUrls.length === 0) {
    return { valid: false, error: "Input image is required" };
  }

  // CRITICAL: Only one image allowed for video generation
  if (Array.isArray(inputs.fileUrls) && inputs.fileUrls.length > 1) {
    return { valid: false, error: "Only one image is supported for video generation" };
  }

  return { valid: true };
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, uploadedImages, uploadImagesToStorage, startPolling } = params;

  const allInputs: Record<string, unknown> = { ...modelParameters, prompt };

  // Upload image and get URL
  if (uploadedImages && uploadedImages.length > 0) {
    allInputs.fileUrls = await uploadImagesToStorage(userId);
  }

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
      prompt: prompt,
      custom_parameters: preparePayload(allInputs),
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
