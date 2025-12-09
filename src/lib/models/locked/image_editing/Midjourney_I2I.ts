/**
 * Midjourney Image-to-Image Model
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * CRITICAL FIXES APPLIED:
 * - Endpoint: /api/v1/mj/generate (NOT /api/v1/jobs/createTask)
 * - Payload: FLAT structure (NOT wrapper)
 * - Image field: fileUrls array (NOT image_url string)
 * - Added: taskType, speed, version, stylization, variety, weirdness, aspectRatio
 *
 * @locked
 * @model midjourney/image-to-image
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
  modelId: "midjourney/image-to-image",
  recordId: "f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c",
  modelName: "Midjourney",
  provider: "kie_ai",
  contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_IMAGE",
  baseCreditCost: 1.5,
  estimatedTimeSeconds: 60,
  costMultipliers: {
    speed: { relaxed: 1, fast: 1.3334, turbo: 5.3334 },
  },
  apiEndpoint: "/api/v1/mj/generate", // CORRECTED: Was /api/v1/jobs/createTask
  payloadStructure: "flat", // CORRECTED: Was wrapper
  maxImages: 4, // Can provide multiple reference images
  maxFileSize: 10 * 1024 * 1024,
  defaultOutputs: 4,
  isActive: true,
  logoUrl: "/logos/midjourney.png",
  modelFamily: "Midjourney",
  variantName: "Midjourney",
  displayOrderInFamily: 2,
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_image/Midjourney_I2I.ts",
} as const;

// ============================================================================
// SCHEMA - CORRECTED TO MATCH API
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
      description: "Text prompt describing the desired image transformation",
      maxLength: 2000,
      renderer: "prompt",
    },
    fileUrls: {
      type: "array",
      title: "Reference Images",
      description: "One or more reference images for transformation",
      renderer: "image",
      items: { type: "string", format: "uri" },
      minItems: 1,
    },
    aspectRatio: {
      type: "string",
      title: "Aspect Ratio",
      default: "1:1",
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
    speed: {
      type: "string",
      title: "Speed",
      default: "fast",
      enum: ["relaxed", "fast", "turbo"],
      enumLabels: {
        relaxed: "Relaxed (Slower, Cheaper)",
        fast: "Fast",
        turbo: "Turbo (Fastest)",
      },
    },
    version: {
      type: "string",
      title: "Version",
      default: "7",
      enum: ["7", "6.1", "6", "5.2", "5.1", "niji6"],
      enumLabels: {
        "7": "V7 (Latest)",
        "6.1": "V6.1",
        "6": "V6",
        "5.2": "V5.2",
        "5.1": "V5.1",
        niji6: "Niji 6 (Anime)",
      },
      isAdvanced: true,
    },
    stylization: {
      type: "integer",
      title: "Stylization",
      default: 100,
      minimum: 0,
      maximum: 1000,
      step: 50,
      description: "Artistic style intensity (0-1000). Higher = more stylized.",
      isAdvanced: true,
    },
    variety: {
      type: "integer",
      title: "Variety",
      default: 0,
      minimum: 0,
      maximum: 100,
      step: 5,
      description: "Diversity of results (0-100). Higher = more diverse.",
      isAdvanced: true,
    },
    weirdness: {
      type: "integer",
      title: "Weirdness",
      default: 0,
      minimum: 0,
      maximum: 3000,
      step: 100,
      description: "Creativity level (0-3000). Higher = more unusual.",
      isAdvanced: true,
    },
    waterMark: {
      type: "string",
      title: "Watermark",
      description: "Optional watermark text to add to generated images",
      isAdvanced: true,
    },
  },
  "x-order": ["prompt", "fileUrls", "aspectRatio", "speed", "version", "stylization"],
});

// ============================================================================
// PAYLOAD PREPARATION - FLAT STRUCTURE WITH taskType
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    taskType: "mj_img2img", // REQUIRED for I2I
    prompt: inputs.prompt || "",
    fileUrls: inputs.fileUrls || [],
    aspectRatio: inputs.aspectRatio || "1:1",
    speed: inputs.speed || "fast",
    version: inputs.version || "7",
  };

  // Add optional parameters only if provided and non-default
  if (inputs.stylization !== undefined && inputs.stylization !== 100) {
    payload.stylization = inputs.stylization;
  }
  if (inputs.variety !== undefined && inputs.variety !== 0) {
    payload.variety = inputs.variety;
  }
  if (inputs.weirdness !== undefined && inputs.weirdness !== 0) {
    payload.weirdness = inputs.weirdness;
  }
  if (inputs.waterMark) {
    payload.waterMark = inputs.waterMark;
  }

  return payload;
}

// ============================================================================
// COST CALCULATION - WITH SPEED MULTIPLIERS
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  const base = MODEL_CONFIG.baseCreditCost;
  const speedKey = (inputs.speed || "fast") as keyof typeof MODEL_CONFIG.costMultipliers.speed;
  const speedMult = MODEL_CONFIG.costMultipliers.speed[speedKey] || 1;
  return Math.round(base * speedMult * 100) / 100;
}

// ============================================================================
// VALIDATION - CORRECTED FOR fileUrls ARRAY
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.prompt || (typeof inputs.prompt === "string" && inputs.prompt.trim() === "")) {
    return { valid: false, error: "Prompt is required" };
  }
  if (typeof inputs.prompt === "string" && inputs.prompt.length > 2000) {
    return { valid: false, error: "Prompt must be 2000 characters or less" };
  }

  if (!inputs.fileUrls || !Array.isArray(inputs.fileUrls) || inputs.fileUrls.length === 0) {
    return { valid: false, error: "At least one reference image is required" };
  }

  // Validate advanced parameters
  if (inputs.stylization !== undefined) {
    const s = inputs.stylization as number;
    if (s < 0 || s > 1000) {
      return { valid: false, error: "Stylization must be between 0 and 1000" };
    }
  }
  if (inputs.variety !== undefined) {
    const v = inputs.variety as number;
    if (v < 0 || v > 100) {
      return { valid: false, error: "Variety must be between 0 and 100" };
    }
  }
  if (inputs.weirdness !== undefined) {
    const w = inputs.weirdness as number;
    if (w < 0 || w > 3000) {
      return { valid: false, error: "Weirdness must be between 0 and 3000" };
    }
  }

  return { valid: true };
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, uploadedImages, uploadImagesToStorage, startPolling } = params;

  const allInputs: Record<string, unknown> = { ...modelParameters, prompt };

  // Upload images and get URLs
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
      generation_id: generationId,
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
