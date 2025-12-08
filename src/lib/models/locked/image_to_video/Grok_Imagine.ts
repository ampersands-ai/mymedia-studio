/** Grok Imagine Image-to-Video (image_to_video) - Record: 8c46aade-1272-4409-bb3a-3701e2423320 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Grok Imagine Image-to-Video
 *
 * TWO INPUT METHODS (use one, not both):
 * 1. External image URL (image_urls array) - Spicy mode NOT supported
 * 2. Grok task_id + index - Spicy mode IS supported
 *
 * When using task_id, you reference a previous Grok image generation
 * and select one of the 6 generated images (index 0-5)
 */
export const MODEL_CONFIG = {
  modelId: "grok-imagine/image-to-video",
  recordId: "8c46aade-1272-4409-bb3a-3701e2423320",
  modelName: "Grok Imagine",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 10,
  estimatedTimeSeconds: 300,
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
  lockedFilePath: "src/lib/models/locked/image_to_video/Grok_Imagine_I2V.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_urls",
  properties: {
    // Method 1: External image URL
    prompt: {
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      title: "Prompt (Optional)",
      description: "Text prompt describing the desired video motion",
    },
    image_urls: {
      type: "array",
      title: "Upload Image",
      renderer: "image",
      items: { type: "string", format: "uri" },
      maxItems: 1,
    },
    // Method 2: Grok task reference
    task_id: {
      type: "string",
      maxLength: 100,
      title: "Grok Task ID",
      showToUser: false,
      description: "Task ID from a previous Grok image generation. Supports Spicy mode. Don't use with image_urls.",
    },
    index: {
      type: "integer",
      minimum: 0,
      maximum: 5,
      default: 0,
      title: "Image Index",
      showToUser: false,
      description: "Which of the 6 generated images to use (0-5). Only used with task_id.",
    },
    mode: {
      default: "normal",
      enum: ["fun", "normal"],
      enumLabels: {
        fun: "Fun",
        normal: "Normal",
      },
      type: "string",
      title: "Mode",
    },
  },
  required: ["prompt", "image_urls"], // No individual field is strictly required, but need image_urls OR task_id
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  const hasImageUrls = inputs.image_urls && inputs.image_urls.length > 0;
  const hasTaskId = inputs.task_id && inputs.task_id.length > 0;

  // Must have one input method
  if (!hasImageUrls && !hasTaskId) {
    return { valid: false, error: "Either image_urls or task_id is required" };
  }

  // Cannot have both input methods
  if (hasImageUrls && hasTaskId) {
    return { valid: false, error: "Provide either image_urls OR task_id, not both" };
  }

  // Spicy mode not supported with external images
  if (hasImageUrls && inputs.mode === "spicy") {
    return {
      valid: false,
      error: "Spicy mode is not supported with external images. Use Normal/Fun mode, or use task_id instead.",
    };
  }

  // Validate task_id constraints
  if (hasTaskId) {
    if (inputs.task_id.length > 100) {
      return { valid: false, error: "Task ID must be 100 characters or less" };
    }
    if (inputs.index !== undefined && (inputs.index < 0 || inputs.index > 5)) {
      return { valid: false, error: "Index must be between 0 and 5" };
    }
  }

  // Validate prompt length
  if (inputs.prompt && inputs.prompt.length > 5000) {
    return { valid: false, error: "Prompt must be 5000 characters or less" };
  }

  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {};

  // Input method 1: External image
  if (inputs.image_urls && inputs.image_urls.length > 0) {
    payload.image_urls = inputs.image_urls;
    // Force mode to non-spicy for external images
    payload.mode = inputs.mode === "spicy" ? "normal" : inputs.mode || "normal";
  }

  // Input method 2: Grok task reference
  if (inputs.task_id) {
    payload.task_id = inputs.task_id;
    if (inputs.index !== undefined) payload.index = inputs.index;
    payload.mode = inputs.mode || "normal";
  }

  // Optional prompt
  if (inputs.prompt) payload.prompt = inputs.prompt;

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
  const inputs: Record<string, any> = { ...modelParameters };
  if (prompt) inputs.prompt = prompt;

  // Upload image if provided (for external image method)
  if (uploadedImages.length > 0) {
    const imageUrls = await uploadImagesToStorage(userId);
    inputs.image_urls = imageUrls; // Keep as array
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
      prompt: prompt || "Grok Imagine video generation",
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
      prompt: prompt || "",
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
