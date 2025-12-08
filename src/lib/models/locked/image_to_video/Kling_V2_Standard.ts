/** Kling V2 Standard (image_to_video) - Record: 88e09730-07e0-4481-bda8-d9d9bde9fec6 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "kling/v2-1-standard",
  recordId: "88e09730-07e0-4481-bda8-d9d9bde9fec6",
  modelName: "Kling V2.1 Standard",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 12.5,
  estimatedTimeSeconds: 300,
  costMultipliers: { duration: { "5": 1, "10": 2 } },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/kling.png",
  modelFamily: "Kling",
  variantName: "Kling V2.1 Standard",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Kling_V2_Standard.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  properties: {
    prompt: {
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt describing the desired video content",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Image",
      description: "URL of image for video generation. Formats: jpeg, png, webp (max 10MB)",
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
      maxLength: 500,
      type: "string",
      description: "Elements to avoid in the generated video",
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
  if (inputs.prompt.length > 5000) return { valid: false, error: "Prompt must be 5000 characters or less" };
  if (inputs.negative_prompt && inputs.negative_prompt.length > 500) {
    return { valid: false, error: "Negative prompt must be 500 characters or less" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    image_url: inputs.image_url,
    duration: inputs.duration || "5",
  };

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

  if (uploadedImages.length > 0) {
    inputs.image_url = (await uploadImagesToStorage(userId))[0];
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
