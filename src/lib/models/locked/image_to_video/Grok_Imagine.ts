/** Grok Imagine Image-to-Video (image_to_video) - Record: 8c46aade-1272-4409-bb3a-3701e2423320 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Grok Imagine Image-to-Video
 *
 * Animate any image into a video with AI-powered motion.
 * - Upload an image and describe the desired motion
 * - Choose between 6 or 10 second duration
 * - Fun and Normal modes available
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
    duration: {
      default: "6",
      enum: ["6", "10"],
      enumLabels: {
        "6": "6 seconds",
        "10": "10 seconds",
      },
      type: "string",
      title: "Duration",
      description: "Video duration in seconds",
    },
  },
  required: ["image_urls"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  // Must have an image
  if (!inputs.image_urls || inputs.image_urls.length === 0) {
    return { valid: false, error: "An image is required" };
  }

  // Validate prompt length
  if (inputs.prompt && inputs.prompt.length > 5000) {
    return { valid: false, error: "Prompt must be 5000 characters or less" };
  }

  // Validate duration
  if (inputs.duration && !["6", "10"].includes(inputs.duration)) {
    return { valid: false, error: "Duration must be 6 or 10 seconds" };
  }

  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {};

  // Image input
  payload.image_urls = inputs.image_urls;
  payload.mode = inputs.mode || "normal";

  // Optional prompt
  if (inputs.prompt) payload.prompt = inputs.prompt;

  // Duration (default to 6 seconds)
  payload.duration = inputs.duration || "6";

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
    const errorMessage = await extractEdgeFunctionError(funcError);
    throw new Error(errorMessage);
  }

  startPolling(gen.id);
  return gen.id;
}
