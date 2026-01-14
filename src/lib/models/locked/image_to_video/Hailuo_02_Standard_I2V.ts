/** Hailuo 02 Standard Image-to-Video (image_to_video) - Record: a0c5d6e7-2f3a-4b5c-6d7e-8f9a0b1c2d3e */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";

/**
 * Hailuo 02 Standard Image-to-Video
 * - Resolution: 512P or 768P
 * - Duration: 6s or 10s
 * - Pricing:
 *   - 512P: 1 credit/sec → 6s=6, 10s=10 credits
 *   - 768P: 2.5 credits/sec → 6s=15, 10s=25 credits
 * - Supports start + optional end frame (end_image_url)
 * - prompt_optimizer available
 */
export const MODEL_CONFIG = {
  modelId: "hailuo/02-image-to-video-standard",
  recordId: "a0c5d6e7-2f3a-4b5c-6d7e-8f9a0b1c2d3e",
  modelName: "Hailuo 02 Standard",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 6, // Default: 768P 6s
  estimatedTimeSeconds: 120,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 2, // start + optional end image
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  costMultipliers: null,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/hailuo.png",
  modelFamily: "Hailuo",
  variantName: "Hailuo 2 Standard",
  displayOrderInFamily: 4,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Hailuo_02_Standard_I2V.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  properties: {
    prompt: {
      maxLength: 1500,
      renderer: "prompt",
      type: "string",
      description: "Text prompt describing the video to generate",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Start Frame Image",
      description: "Image to use as the first frame. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    end_image_url: {
      type: "string",
      format: "uri",
      title: "End Frame Image (Optional)",
      description: "Optional image to use as the last frame. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    duration: {
      default: "6",
      enum: ["6", "10"],
      enumLabels: {
        "6": "6 seconds",
        "10": "10 seconds",
      },
      type: "string",
      title: "Duration",
    },
    resolution: {
      default: "768P",
      enum: ["512P", "768P"],
      type: "string",
      title: "Resolution",
    },
    prompt_optimizer: {
      type: "boolean",
      default: false,
      showToUser: false,
      title: "Prompt Optimizer",
      description: "Use the model's prompt optimizer for better results",
    },
  },
  required: ["prompt", "image_url"],
  type: "object",
} as const;

export function validate(inputs: Record<string, unknown>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (typeof inputs.prompt === "string" && inputs.prompt.length > 1500)
    return { valid: false, error: "Prompt must be 1500 characters or less" };
  if (!inputs.image_url) return { valid: false, error: "Start frame image required" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    prompt: inputs.prompt,
    image_url: inputs.image_url,
  };

  if (inputs.end_image_url) payload.end_image_url = inputs.end_image_url;
  if (inputs.duration) payload.duration = inputs.duration;
  if (inputs.resolution) payload.resolution = inputs.resolution;
  if (inputs.prompt_optimizer !== undefined) payload.prompt_optimizer = inputs.prompt_optimizer;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, unknown>) {
  const duration = (inputs.duration as string) || "6";
  const resolution = (inputs.resolution as string) || "768P";

  // Pricing matrix
  const pricing: Record<string, Record<string, number>> = {
    "512P": { "6": 6, "10": 10 },
    "768P": { "6": 15, "10": 25 },
  };

  return pricing[resolution]?.[duration] ?? 15;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, unknown> = { prompt, ...modelParameters };

  // Upload images and assign to appropriate fields
  if (uploadedImages.length > 0) {
    const imageUrls = await uploadImagesToStorage(userId);
    inputs.image_url = imageUrls[0]; // First image is start frame
    if (imageUrls.length > 1) {
      inputs.end_image_url = imageUrls[1]; // Second image is end frame
    }
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
    const errorMessage = await extractEdgeFunctionError(funcError);
    throw new Error(errorMessage);
  }

  startPolling(gen.id);
  return gen.id;
}
