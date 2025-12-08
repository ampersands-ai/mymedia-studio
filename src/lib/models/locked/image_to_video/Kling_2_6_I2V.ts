/** Kling 2.6 (image_to_video) - Record: b4c8d0e2-5f6a-7b8c-9d0e-1f2a3b4c5d6e */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Kling 2.6 - Latest version with sound generation support
 * Key differences from V2.x:
 * - Uses `image_urls` (array) instead of `image_url` (string)
 * - Has `sound` parameter for audio generation
 * - Shorter prompt limit (1000 chars)
 * - No cfg_scale or negative_prompt
 */
export const MODEL_CONFIG = {
  modelId: "kling-2.6/image-to-video",
  recordId: "b4c8d0e2-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
  modelName: "Kling 2.6",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 28,
  estimatedTimeSeconds: 200,
  costMultipliers: { duration: { "5": 1, "10": 2 }, sound: { false: 1, true: 2 } },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/kling.png",
  modelFamily: "Kling",
  variantName: "Kling 2.6",
  displayOrderInFamily: 5,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Kling_2_6_I2V.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_urls",
  properties: {
    prompt: {
      maxLength: 1000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt used to generate the video",
    },
    image_urls: {
      type: "array",
      title: "Image",
      description: "URL of image for video generation. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
      items: { type: "string", format: "uri" },
      minItems: 1,
      maxItems: 1,
    },
    sound: {
      type: "boolean",
      default: false,
      title: "Generate Sound",
      description: "Whether the generated video contains sound",
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
  },
  required: ["prompt", "image_urls", "sound", "duration"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (!inputs.image_urls || inputs.image_urls.length === 0) {
    return { valid: false, error: "Image required" };
  }
  if (inputs.prompt.length > 1000) return { valid: false, error: "Prompt must be 1000 characters or less" };
  if (inputs.sound === undefined) return { valid: false, error: "Sound parameter required" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    model: MODEL_CONFIG.modelId,
    input: {
      prompt: inputs.prompt,
      image_urls: inputs.image_urls,
      sound: inputs.sound ?? false,
      duration: inputs.duration || "5",
    },
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const durKey = String(inputs.duration || "5") as keyof typeof MODEL_CONFIG.costMultipliers.duration;
  return MODEL_CONFIG.baseCreditCost * (MODEL_CONFIG.costMultipliers.duration[durKey] || 1);
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };

  // Upload images and get URLs as array
  if (uploadedImages.length > 0) {
    inputs.image_urls = await uploadImagesToStorage(userId);
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
