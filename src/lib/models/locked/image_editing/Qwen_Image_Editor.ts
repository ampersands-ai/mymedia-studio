/** Qwen Image Editor (image_editing) - Record: 58a5db33-7729-48e8-88e5-ee05ea4c0c13 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";

export const MODEL_CONFIG = {
  modelId: "qwen/image-edit",
  recordId: "b6d430f1-e823-4192-bf72-0dba29079931",
  modelName: "Qwen Image Editor",
  provider: "kie_ai",
  contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_EDITING",
  baseCreditCost: 1,
  estimatedTimeSeconds: 25,
  costMultipliers: {
    image_size: {
      square: 1,
      square_hd: 3.5,
      portrait_4_3: 2.5,
      portrait_16_9: 2,
      landscape_4_3: 2.5,
      landscape_16_9: 2,
    },
    num_images: { "1": 1, "2": 2, "3": 3, "4": 4 },
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/qwen.png",
  modelFamily: "Qwen",
  variantName: "Image Editor",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Qwen_Image_Editor.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  properties: {
    // ============ MAIN UI PARAMETERS ============
    prompt: {
      type: "string",
      maxLength: 2000,
      renderer: "prompt",
      description: "The prompt to generate the image with",
    },
    image_url: {
      type: "string",
      renderer: "image",
      description: "The URL of the image to edit. Accepted types: image/jpeg, image/png, image/webp. Max size: 10MB",
    },
    image_size: {
      type: "string",
      enum: ["square", "square_hd", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"],
      default: "landscape_4_3",
      description: "The size of the generated image",
    },
    num_images: {
      type: "string",
      enum: ["1", "2", "3", "4"],
      default: "1",
      description: "Number of images to generate",
    },
    output_format: {
      type: "string",
      enum: ["png", "jpeg"],
      isAdvanced: true,
      default: "png",
      description: "The format of the generated image",
    },
    negative_prompt: {
      type: "string",
      maxLength: 500,
      isAdvanced: true,
      description: "The negative prompt for the generation",
    },

    // ============ ADVANCED PARAMETERS ============
    num_inference_steps: {
      type: "integer",
      minimum: 2,
      maximum: 49,
      default: 30,
      isAdvanced: true,
      description: "The number of inference steps to perform",
    },
    guidance_scale: {
      type: "number",
      minimum: 0,
      maximum: 20,
      step: 0.1,
      default: 4,
      isAdvanced: true,
      description: "The CFG (Classifier Free Guidance) scale - how closely to follow the prompt",
    },
    acceleration: {
      type: "string",
      enum: ["none", "regular", "high"],
      default: "none",
      isAdvanced: true,
      description: "Acceleration level. 'regular' balances speed/quality.",
    },
    seed: {
      type: "integer",
      isAdvanced: true,
      description: "The same seed and prompt will output the same image every time",
    },

    // ============ HIDDEN PARAMETERS ============
    sync_mode: {
      type: "boolean",
      default: false,
      showToUser: false,
      description: "If true, wait for image generation before returning response",
    },
    enable_safety_checker: {
      type: "boolean",
      default: true,
      showToUser: false,
      description: "Enable safety checker",
    },
  },
  required: ["prompt", "image_url"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) {
    return { valid: false, error: "Prompt is required" };
  }
  if (!inputs.image_url) {
    return { valid: false, error: "Image URL is required" };
  }
  if (inputs.prompt.length > 2000) {
    return { valid: false, error: "Prompt must be 2000 characters or less" };
  }
  if (inputs.num_inference_steps !== undefined && (inputs.num_inference_steps < 2 || inputs.num_inference_steps > 49)) {
    return { valid: false, error: "Inference steps must be between 2 and 49" };
  }
  if (inputs.guidance_scale !== undefined && (inputs.guidance_scale < 0 || inputs.guidance_scale > 20)) {
    return { valid: false, error: "Guidance scale must be between 0 and 20" };
  }
  if (inputs.negative_prompt && inputs.negative_prompt.length > 500) {
    return { valid: false, error: "Negative prompt must be 500 characters or less" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    model: MODEL_CONFIG.modelId,
    input: {
      prompt: inputs.prompt,
      image_url: inputs.image_url,
      image_size: inputs.image_size ?? "landscape_4_3",
      num_inference_steps: inputs.num_inference_steps ?? 30,
      guidance_scale: inputs.guidance_scale ?? 4,
      output_format: inputs.output_format ?? "png",
      acceleration: inputs.acceleration ?? "none",
      sync_mode: inputs.sync_mode ?? false,
      enable_safety_checker: inputs.enable_safety_checker ?? true,
    },
  };

  // Add optional parameters only if provided
  if (inputs.num_images && inputs.num_images !== "1") {
    payload.input.num_images = inputs.num_images;
  }
  if (inputs.negative_prompt) {
    payload.input.negative_prompt = inputs.negative_prompt;
  }
  if (inputs.seed !== undefined && inputs.seed !== null) {
    payload.input.seed = inputs.seed;
  }

  return payload;
}

export function calculateCost(inputs: Record<string, any>) {
  const base = MODEL_CONFIG.baseCreditCost;
  const imageSizeKey = (inputs.image_size || "landscape_4_3") as keyof typeof MODEL_CONFIG.costMultipliers.image_size;
  const imageSizeMult = MODEL_CONFIG.costMultipliers.image_size?.[imageSizeKey] || 1;
  const numImagesKey = (inputs.num_images || "1") as keyof typeof MODEL_CONFIG.costMultipliers.num_images;
  const numImagesMult = MODEL_CONFIG.costMultipliers.num_images?.[numImagesKey] || 1;
  return base * imageSizeMult * numImagesMult;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;

  const inputs: Record<string, any> = { prompt, ...modelParameters };

  // Upload image and get URL if provided
  if (uploadedImages.length > 0) {
    inputs.image_url = (await uploadImagesToStorage(userId))[0];
  }

  // Validate inputs
  const validation = validate(inputs);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Calculate and reserve credits
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);

  // Create generation record with pending status (edge function will process)
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
      settings: modelParameters,
    })
    .select()
    .single();

  if (error || !gen) {
    throw new Error(`Failed: ${error?.message}`);
  }

  // Call edge function to handle API call server-side
  // This keeps API keys secure and avoids CORS issues
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
