/** Seedance V1 Pro Image-to-Video (image_to_video) - Record: 50eb3f02-1e58-4b85-a535-e8391a5623c4 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Seedance V1 Pro Image-to-Video
 * - Higher quality than Lite
 * - Resolution: 480p, 720p, 1080p
 * - Duration: 5s or 10s
 * - Camera fixed option
 */
export const MODEL_CONFIG = {
  modelId: "bytedance/v1-pro-image-to-video",
  recordId: "50eb3f02-1e58-4b85-a535-e8391a5623c4",
  modelName: "Seedance V1 Pro",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 8,
  estimatedTimeSeconds: 300,
  costMultipliers: {
    duration: { "5": 1, "10": 2 },
    resolution: { "480p": 0.5, "720p": 1, "1080p": 2 },
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/seedance.png",
  modelFamily: "Seedance",
  variantName: "Seedance V1 Pro",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Seedance_V1_Pro_I2V.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  properties: {
    prompt: {
      maxLength: 10000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt to guide video generation",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Input Image",
      description: "Image to animate. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    resolution: {
      default: "720p",
      enum: ["480p", "720p", "1080p"],
      enumLabels: {
        "480p": "480p (Fast)",
        "720p": "720p (Balanced)",
        "1080p": "1080p (High Quality)",
      },
      type: "string",
      title: "Resolution",
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
    camera_fixed: {
      type: "boolean",
      default: false,
      title: "Fixed Camera",
      description: "Whether to fix the camera position",
    },
    seed: {
      type: "integer",
      minimum: -1,
      maximum: 2147483647,
      default: -1,
      title: "Seed",
      description: "Random seed for reproducibility. Use -1 for random.",
    },
    enable_safety_checker: {
      type: "boolean",
      default: true,
      title: "Safety Checker",
      description: "Check content for safety before processing",
    },
  },
  required: ["prompt", "image_url"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length > 10000) return { valid: false, error: "Prompt must be 10000 characters or less" };
  if (!inputs.image_url) return { valid: false, error: "Image required" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    image_url: inputs.image_url,
  };

  if (inputs.resolution) payload.resolution = inputs.resolution;
  if (inputs.duration) payload.duration = inputs.duration;
  if (inputs.camera_fixed !== undefined) payload.camera_fixed = inputs.camera_fixed;
  if (inputs.seed !== undefined && inputs.seed !== null) payload.seed = inputs.seed;
  if (inputs.enable_safety_checker !== undefined) payload.enable_safety_checker = inputs.enable_safety_checker;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const base = MODEL_CONFIG.baseCreditCost;
  const durKey = (inputs.duration || "5") as keyof typeof MODEL_CONFIG.costMultipliers.duration;
  const resKey = (inputs.resolution || "720p") as keyof typeof MODEL_CONFIG.costMultipliers.resolution;

  const durMult = MODEL_CONFIG.costMultipliers.duration[durKey] || 1;
  const resMult = MODEL_CONFIG.costMultipliers.resolution[resKey] || 1;

  return Math.round(base * durMult * resMult * 100) / 100;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };

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
