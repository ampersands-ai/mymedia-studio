/** Wan 2.2-a14b Image-to-Video Turbo (image_to_video) - Record: e4f9a0b1-6c7d-8e9f-0a1b-2c3d4e5f6a7b */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Wan 2.2-a14b Image-to-Video Turbo
 * - Resolutions: 480p, 580p, 720p
 * - Aspect ratios: auto, 16:9, 9:16, 1:1 (auto detects from image)
 * - Acceleration options: none, regular
 * - Pricing per second: 480p=4, 580p=6, 720p=8 credits
 * - Fixed ~5s video duration
 */
export const MODEL_CONFIG = {
  modelId: "wan/2-2-a14b-image-to-video-turbo",
  recordId: "e4f9a0b1-6c7d-8e9f-0a1b-2c3d4e5f6a7b",
  modelName: "Wan 2.2 Turbo",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 20, // Default: 720p × 5s = 8 × 5
  estimatedTimeSeconds: 120,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  costMultipliers: {
    resolution: { "480p": 1, "580p": 1.5, "720p": 2 },
  },
  // UI metadata
  isActive: true,
  logoUrl: "/logos/wan.png",
  modelFamily: "Wan",
  variantName: "Wan 2.2 Turbo",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Wan_2_2_Turbo_I2V.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  properties: {
    prompt: {
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt to guide video generation",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Input Image",
      description:
        "Image to animate. Will be resized/cropped to match aspect ratio. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    resolution: {
      default: "480p",
      enum: ["480p", "580p", "720p"],
      enumLabels: {
        "480p": "480p (Budget)",
        "580p": "580p (Standard)",
        "720p": "720p (HD)",
      },
      type: "string",
      title: "Resolution",
    },
    aspect_ratio: {
      default: "auto",
      enum: ["auto", "16:9", "9:16", "1:1"],
      enumLabels: {
        auto: "Auto (from image)",
        "16:9": "Landscape (16:9)",
        "9:16": "Portrait (9:16)",
        "1:1": "Square (1:1)",
      },
      type: "string",
      title: "Aspect Ratio",
    },
    enable_prompt_expansion: {
      type: "boolean",
      default: false,
      title: "Prompt Expansion",
      showToUser: false,
      description: "Use LLM to expand prompt with additional details",
    },
    seed: {
      type: "integer",
      minimum: 0,
      maximum: 2147483647,
      title: "Seed",
      isAdvanced: true,
      description: "Random seed for reproducibility (leave empty for random)",
    },
    acceleration: {
      default: "none",
      enum: ["none", "regular"],
      isAdvanced: true,
      enumLabels: {
        none: "None (Best Quality)",
        regular: "Regular (Faster)",
      },
      type: "string",
      title: "Acceleration",
      description: "More acceleration = faster but lower quality",
    },
  },
  required: ["prompt", "image_url"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length > 5000) return { valid: false, error: "Prompt must be 5000 characters or less" };
  if (!inputs.image_url) return { valid: false, error: "Image required" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    image_url: inputs.image_url,
  };

  if (inputs.resolution) payload.resolution = inputs.resolution;
  if (inputs.aspect_ratio) payload.aspect_ratio = inputs.aspect_ratio;
  if (inputs.enable_prompt_expansion !== undefined) payload.enable_prompt_expansion = inputs.enable_prompt_expansion;
  if (inputs.seed !== undefined && inputs.seed !== null) payload.seed = inputs.seed;
  if (inputs.acceleration) payload.acceleration = inputs.acceleration;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const resolution = inputs.resolution || "720p";
  const videoDuration = 5; // Fixed ~5s duration

  // Pricing per second by resolution
  const ratePerSecond: Record<string, number> = {
    "480p": 4,
    "580p": 6,
    "720p": 8,
  };

  return (ratePerSecond[resolution] || 8) * videoDuration;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };

  // Upload image
  if (uploadedImages.length > 0) {
    const imageUrls = await uploadImagesToStorage(userId);
    inputs.image_url = imageUrls[0];
  }

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
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  const { error: funcError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt,
      custom_parameters: preparePayload(inputs),
    },
  });

  if (funcError) {
    await supabase.from("generations").update({ status: GENERATION_STATUS.FAILED }).eq("id", gen.id);
    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  startPolling(gen.id);
  return gen.id;
}
