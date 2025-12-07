/** Kling V2.5 Turbo Pro (image_to_video) - Record: a3b7c9d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "kling/v2-5-turbo-image-to-video-pro",
  recordId: "a3b7c9d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
  modelName: "Kling V2.5 Turbo Pro",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 15,
  estimatedTimeSeconds: 180,
  costMultipliers: { duration: { "5": 1, "10": 2 } },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 2, // start + optional end frame
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/kling.png",
  modelFamily: "Kling",
  variantName: "V2.5 Turbo Pro",
  displayOrderInFamily: 4,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Kling_V2_5_Turbo_Pro_I2V.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  properties: {
    prompt: {
      maxLength: 2500,
      renderer: "prompt",
      type: "string",
      description: "Text description for the video generation",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Start Frame",
      description: "URL of start frame image. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    tail_image_url: {
      type: "string",
      format: "uri",
      title: "End Frame (Optional)",
      description: "Tail frame image of video. Formats: jpeg, png, webp (max 10MB)",
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
    },
    negative_prompt: {
      default: "blur, distort, and low quality",
      maxLength: 2496,
      type: "string",
      description: "Elements to avoid in the video",
    },
    cfg_scale: {
      type: "number",
      minimum: 0,
      maximum: 1,
      step: 0.1,
      default: 0.5,
      title: "CFG Scale",
      description: "How closely to follow the prompt (0-1)",
      showToUser: false,
    },
  },
  required: ["prompt", "image_url"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (!inputs.image_url) return { valid: false, error: "Image required" };
  if (inputs.prompt.length > 2500) return { valid: false, error: "Prompt must be 2500 characters or less" };
  if (inputs.negative_prompt && inputs.negative_prompt.length > 2496) {
    return { valid: false, error: "Negative prompt must be 2496 characters or less" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    image_url: inputs.image_url,
    duration: inputs.duration || "5",
  };

  if (inputs.tail_image_url) payload.tail_image_url = inputs.tail_image_url;
  if (inputs.negative_prompt) payload.negative_prompt = inputs.negative_prompt;
  if (inputs.cfg_scale !== undefined) payload.cfg_scale = inputs.cfg_scale;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const durKey = String(inputs.duration || "5") as keyof typeof MODEL_CONFIG.costMultipliers.duration;
  return MODEL_CONFIG.baseCreditCost * (MODEL_CONFIG.costMultipliers.duration[durKey] || 1);
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };

  // Upload images - first is start frame, second (if present) is end frame
  if (uploadedImages.length > 0) {
    const urls = await uploadImagesToStorage(userId);
    inputs.image_url = urls[0];
    if (urls[1]) inputs.tail_image_url = urls[1];
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

  // Call edge function to handle API call server-side
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
