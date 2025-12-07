/** Grok Imagine (image_to_video) - Record: 0643a43b-4995-4c5b-ac1d-76ea257a93a0 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "grok-imagine/image-to-video",
  recordId: "0643a43b-4995-4c5b-ac1d-76ea257a93a0",
  modelName: "Grok Imagine",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 10,
  estimatedTimeSeconds: 45,
  costMultipliers: {},
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/grok.png",
  modelFamily: "xAI",
  variantName: "Grok Imagine",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Grok_Imagine.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_urls",
  properties: {
    prompt: {
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      description: "Describe the desired video motion",
    },
    image_urls: {
      type: "array",
      title: "Reference Image",
      description: "One external image URL (max 10MB). Formats: jpeg, png, webp",
      renderer: "image",
      items: { type: "string", format: "uri" },
      maxItems: 1,
    },
    task_id: {
      type: "string",
      maxLength: 100,
      title: "Grok Task ID",
      description: "Task ID from a previous Grok image generation (use instead of image_urls)",
      showToUser: false,
    },
    index: {
      type: "integer",
      minimum: 0,
      maximum: 5,
      default: 0,
      title: "Image Index",
      description: "Which image to use from task_id (0-5, Grok generates 6 images per task)",
      showToUser: false,
    },
    mode: {
      default: "normal",
      enum: ["fun", "normal", "spicy"],
      enumLabels: {
        fun: "Fun",
        normal: "Normal",
        spicy: "Spicy (not supported with external images)",
      },
      type: "string",
    },
  },
  required: ["prompt"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };

  // Must have either image_urls OR task_id, but not both
  const hasImageUrls = inputs.image_urls && inputs.image_urls.length > 0;
  const hasTaskId = inputs.task_id && inputs.task_id.length > 0;

  if (!hasImageUrls && !hasTaskId) {
    return { valid: false, error: "Either image_urls or task_id is required" };
  }
  if (hasImageUrls && hasTaskId) {
    return { valid: false, error: "Provide either image_urls or task_id, not both" };
  }
  if (hasImageUrls && inputs.image_urls.length > 1) {
    return { valid: false, error: "Only one image is supported" };
  }

  // Spicy mode not supported with external images
  if (hasImageUrls && inputs.mode === "spicy") {
    return { valid: false, error: "Spicy mode is not supported with external images. Use Normal or Fun mode." };
  }

  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    mode: inputs.mode || "normal",
  };

  // Either image_urls or task_id + index
  if (inputs.image_urls && inputs.image_urls.length > 0) {
    payload.image_urls = inputs.image_urls;
  } else if (inputs.task_id) {
    payload.task_id = inputs.task_id;
    if (inputs.index !== undefined) {
      payload.index = inputs.index;
    }
  }

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(_inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };

  // Upload images and get URLs if provided
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
