/** Hailuo 02 Pro Image-to-Video (image_to_video) - Record: f9b4c5d6-1e2f-3a4b-5c6d-7e8f9a0b1c2d */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Hailuo 02 Pro Image-to-Video
 * - Fixed 1080p 6-second output
 * - 5 credits/second = 30 credits per generation
 * - Supports start image + optional end frame (end_image_url)
 * - prompt_optimizer available
 */
export const MODEL_CONFIG = {
  modelId: "hailuo/02-image-to-video-pro",
  recordId: "f9b4c5d6-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
  modelName: "Hailuo 02 Pro",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 30, // 5 credits/sec × 6 seconds
  estimatedTimeSeconds: 180,
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
  variantName: "02 Pro Image-to-Video",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Hailuo_02_Pro_I2V.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  properties: {
    prompt: {
      maxLength: 1500,
      renderer: "prompt",
      type: "string",
      description: "Text prompt describing the desired video animation",
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
    prompt_optimizer: {
      type: "boolean",
      default: true,
      title: "Prompt Optimizer",
      description: "Use the model's prompt optimizer for better results",
    },
  },
  required: ["prompt", "image_url"],
  type: "object",
} as const;

export function validate(inputs: Record<string, unknown>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (typeof inputs.prompt === "string" && inputs.prompt.length > 1500) return { valid: false, error: "Prompt must be 1500 characters or less" };
  if (!inputs.image_url) return { valid: false, error: "Start frame image required" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    prompt: inputs.prompt,
    image_url: inputs.image_url,
  };

  if (inputs.end_image_url) payload.end_image_url = inputs.end_image_url;
  if (inputs.prompt_optimizer !== undefined) payload.prompt_optimizer = inputs.prompt_optimizer;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(_inputs: Record<string, unknown>) {
  return MODEL_CONFIG.baseCreditCost;
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
    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  startPolling(gen.id);
  return gen.id;
}
