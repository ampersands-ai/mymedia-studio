/** Wan 2.5 Image-to-Video (image_to_video) - Record: a6b1c2d3-8e9f-0a1b-2c3d-4e5f6a7b8c9d */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Wan 2.5 Image-to-Video
 * - Resolutions: 720p, 1080p
 * - Duration: 5s or 10s
 * - Supports negative_prompt
 * - Pricing: 720p=6 credits/sec, 1080p=10 credits/sec
 */
export const MODEL_CONFIG = {
  modelId: "wan/2-5-image-to-video",
  recordId: "a6b1c2d3-8e9f-0a1b-2c3d-4e5f6a7b8c9d",
  modelName: "Wan 2.5",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 30, // Default: 720p × 5s = 6 × 5
  estimatedTimeSeconds: 180,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  costMultipliers: null,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/wan.png",
  modelFamily: "Wan",
  variantName: "2.5 Image-to-Video",
  displayOrderInFamily: 4,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Wan_2_5_I2V.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  properties: {
    prompt: {
      maxLength: 800,
      renderer: "prompt",
      type: "string",
      description: "Text prompt describing the desired video motion",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "First Frame Image",
      description: "Image to use as the first frame. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    duration: {
      default: "5",
      enum: ["5", "10"],
      enumLabels: {
        "5": "5 seconds",
        "10": "10 seconds",
      },
      type: "string",
      title: "Duration",
    },
    resolution: {
      default: "720p",
      enum: ["720p", "1080p"],
      enumLabels: {
        "720p": "720p (HD)",
        "1080p": "1080p (Full HD)",
      },
      type: "string",
      title: "Resolution",
    },
    negative_prompt: {
      maxLength: 500,
      type: "string",
      title: "Negative Prompt",
      description: "Describe content to avoid in the video",
    },
    enable_prompt_expansion: {
      type: "boolean",
      default: true,
      title: "Prompt Expansion",
      description: "Use LLM to rewrite/improve prompt",
    },
    seed: {
      type: "integer",
      title: "Seed",
      description: "Random seed for reproducibility (leave empty for random)",
    },
  },
  required: ["prompt", "image_url"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length > 800) return { valid: false, error: "Prompt must be 800 characters or less" };
  if (!inputs.image_url) return { valid: false, error: "Image required" };
  if (inputs.negative_prompt && inputs.negative_prompt.length > 500) {
    return { valid: false, error: "Negative prompt must be 500 characters or less" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    image_url: inputs.image_url,
  };

  if (inputs.duration) payload.duration = inputs.duration;
  if (inputs.resolution) payload.resolution = inputs.resolution;
  if (inputs.negative_prompt) payload.negative_prompt = inputs.negative_prompt;
  if (inputs.enable_prompt_expansion !== undefined) payload.enable_prompt_expansion = inputs.enable_prompt_expansion;
  if (inputs.seed !== undefined && inputs.seed !== null) payload.seed = inputs.seed;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const duration = parseInt(inputs.duration || "5");
  const resolution = inputs.resolution || "720p";

  // Pricing per second by resolution
  const ratePerSecond: Record<string, number> = {
    "720p": 6,
    "1080p": 10,
  };

  return (ratePerSecond[resolution] || 6) * duration;
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
