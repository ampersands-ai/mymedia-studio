/** Sora 2 Image-to-Video (image_to_video) - Record: b0c4d5e6-1f2a-3b4c-5d6e-7f8a9b0c1d2e */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";

export const MODEL_CONFIG = {
  modelId: "sora-2-image-to-video",
  recordId: "b0c4d5e6-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  modelName: "Sora 2",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 15,
  estimatedTimeSeconds: 1000,
  costMultipliers: {
    n_frames: { "10": 1, "15": 1.16667 },
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/sora.png",
  modelFamily: "Sora",
  variantName: "Sora 2",
  displayOrderInFamily: 3,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Sora_2_I2V.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_urls",
  properties: {
    prompt: {
      maxLength: 10000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt describing the desired video motion",
    },
    image_urls: {
      type: "array",
      title: "First Frame Image",
      description:
        "Image to use as the first frame. Formats: jpeg, png, webp (max 10MB). We currently do not support uploads of images containing photorealistic people (AI generated).",
      renderer: "image",
      items: { type: "string", format: "uri" },
      minItems: 1,
      maxItems: 1,
    },
    aspect_ratio: {
      default: "landscape",
      enum: ["portrait", "landscape"],
      enumLabels: {
        portrait: "Portrait",
        landscape: "Landscape",
      },
      type: "string",
    },
    n_frames: {
      default: "10",
      enum: ["10", "15"],
      enumLabels: {
        "10": "10 seconds",
        "15": "15 seconds",
      },
      type: "string",
      title: "Duration",
    },
    remove_watermark: {
      type: "boolean",
      default: true,
      title: "Remove Watermark",
      showToUser: false,
      description: "Remove watermarks from generated video",
    },
  },
  required: ["prompt", "image_urls"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length > 10000) return { valid: false, error: "Prompt must be 10000 characters or less" };
  if (!inputs.image_urls || inputs.image_urls.length === 0) {
    return { valid: false, error: "Image required" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    image_urls: inputs.image_urls,
  };

  if (inputs.aspect_ratio) payload.aspect_ratio = inputs.aspect_ratio;
  if (inputs.n_frames) payload.n_frames = inputs.n_frames;
  if (inputs.remove_watermark !== undefined) payload.remove_watermark = inputs.remove_watermark;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const base = MODEL_CONFIG.baseCreditCost;
  const framesKey = (inputs.n_frames || "10") as keyof typeof MODEL_CONFIG.costMultipliers.n_frames;
  const framesMult = MODEL_CONFIG.costMultipliers.n_frames[framesKey] || 1;
  return Math.round(base * framesMult * 100) / 100;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };

  // Upload image and get URL as array
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
    const errorMessage = await extractEdgeFunctionError(funcError);
    throw new Error(errorMessage);
  }

  startPolling(gen.id);
  return gen.id;
}
