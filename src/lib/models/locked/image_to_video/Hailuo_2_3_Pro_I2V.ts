/** Hailuo 2.3 Pro Image-to-Video (image_to_video) - Record: b1d6e7f8-3a4b-5c6d-7e8f-9a0b1c2d3e4f */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Hailuo 2.3 Pro Image-to-Video
 * - Resolution: 768P or 1080P
 * - Duration: 6s or 10s (10s NOT supported at 1080P!)
 * - Longer prompts (5000 chars)
 * - Pricing (20% below official):
 *   - 6s 768P: 25 credits
 *   - 10s 768P: 45 credits
 *   - 6s 1080P: 40 credits
 */
export const MODEL_CONFIG = {
  modelId: "hailuo/2-3-image-to-video-pro",
  recordId: "b1d6e7f8-3a4b-5c6d-7e8f-9a0b1c2d3e4f",
  modelName: "Hailuo 2.3 Pro",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 22.5, // Default: 768P 6s
  estimatedTimeSeconds: 180,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  costMultipliers: null,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/hailuo.png",
  modelFamily: "Hailuo",
  variantName: "Hailuo 2.3 Pro",
  displayOrderInFamily: 5,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Hailuo_2_3_Pro_I2V.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  properties: {
    prompt: {
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt describing the desired video animation",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Input Image",
      description: "Image to animate. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    duration: {
      default: "6",
      enum: ["6", "10"],
      enumLabels: {
        "6": "6 seconds",
        "10": "10 seconds (768P only)",
      },
      type: "string",
      title: "Duration",
      description: "10 second videos are NOT supported at 1080P resolution",
    },
    resolution: {
      default: "768P",
      enum: ["768P", "1080P"],
      enumLabels: {
        "768P": "768P",
        "1080P": "1080P (6s only)",
      },
      type: "string",
      title: "Resolution",
    },
  },
  required: ["prompt", "image_url"],
  type: "object",
  fieldDependencies: {
    resolution: {
      duration: {
        "6": ["768P", "1080P"],
        "10": ["768P"],
      },
    },
    duration: {
      resolution: {
        "768P": ["6", "10"],
        "1080P": ["6"],
      },
    },
  },
} as const;

export function validate(inputs: Record<string, unknown>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (typeof inputs.prompt === "string" && inputs.prompt.length > 5000)
    return { valid: false, error: "Prompt must be 5000 characters or less" };
  if (!inputs.image_url) return { valid: false, error: "Image required" };

  // Validate 10s + 1080P combination is not allowed
  if (inputs.duration === "10" && inputs.resolution === "1080P") {
    return { valid: false, error: "10 second videos are not supported at 1080P resolution" };
  }

  return { valid: true };
}

export function preparePayload(inputs: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    prompt: inputs.prompt,
    image_url: inputs.image_url,
  };

  if (inputs.duration) payload.duration = inputs.duration;
  if (inputs.resolution) payload.resolution = inputs.resolution;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, unknown>) {
  const duration = (inputs.duration as string) || "6";
  const resolution = (inputs.resolution as string) || "768P";

  // Pricing matrix (20% below official rates)
  const pricing: Record<string, Record<string, number>> = {
    "768P": { "6": 22.5, "10": 45 },
    "1080P": { "6": 40 }, // 10s not supported at 1080P
  };

  return pricing[resolution]?.[duration] ?? 25;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, unknown> = { prompt, ...modelParameters };

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
