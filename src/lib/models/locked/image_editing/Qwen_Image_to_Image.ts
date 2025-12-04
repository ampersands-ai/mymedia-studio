/** Qwen Image to Image (image_editing) - Record: b5d09ee9-3b13-49b7-a1b3-fbd63a45b02b */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";

export const MODEL_CONFIG = {
  modelId: "qwen/image-to-image",
  recordId: "99532b69-d951-4431-87e3-1d88a9c8ee73",
  modelName: "Qwen Image to Image",
  provider: "kie_ai",
  contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_EDITING",
  baseCreditCost: 2,
  estimatedTimeSeconds: 25,
  costMultipliers: {
    // Cost multipliers based on acceleration level if needed
    acceleration: { none: 1, regular: 1, high: 1 },
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/qwen.png",
  modelFamily: "Qwen",
  variantName: "Image to Image",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Qwen_Image_to_Image.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  properties: {
    // Required parameters
    prompt: {
      type: "string",
      renderer: "prompt",
      maxLength: 5000,
      description: "The prompt to generate the image with",
    },
    image_url: {
      type: "string",
      renderer: "image",
      description:
        "The reference image to guide the generation. Accepted types: image/jpeg, image/png, image/webp. Max size: 10MB",
    },

    // Critical image-to-image parameter
    strength: {
      type: "number",
      minimum: 0,
      maximum: 1,
      step: 0.01,
      default: 0.8,
      isAdvanced: true,
      description: "Denoising strength. 1.0 = fully remake; 0.0 = preserve original",
    },

    // Generation control parameters
    num_inference_steps: {
      type: "integer",
      minimum: 2,
      maximum: 250,
      default: 30,
      isAdvanced: true,
      description: "The number of inference steps to perform",
    },
    guidance_scale: {
      type: "number",
      minimum: 0,
      maximum: 20,
      step: 0.1,
      default: 2.5,
      isAdvanced: true,
      description: "The CFG (Classifier Free Guidance) scale - how closely to follow the prompt",
    },

    // Output parameters
    output_format: {
      type: "string",
      enum: ["png", "jpeg"],
      default: "png",
      isAdvanced: true,
      description: "The format of the generated image",
    },

    // Performance parameters
    acceleration: {
      type: "string",
      enum: ["none", "regular", "high"],
      default: "none",
      isAdvanced: true,
      description: "Acceleration level. 'regular' balances speed/quality. 'high' recommended for images without text",
    },

    // Optional parameters
    negative_prompt: {
      type: "string",
      maxLength: 500,
      isAdvanced: true,
      description: "The negative prompt for the generation",
    },
    seed: {
      type: "integer",
      isAdvanced: true,
      description: "The same seed and prompt will output the same image every time",
    },

    // Safety parameter
    enable_safety_checker: {
      type: "boolean",
      default: true,
      showToUser: false,
      description: "Enable safety checker. Can only be disabled through API.",
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
  if (inputs.strength !== undefined && (inputs.strength < 0 || inputs.strength > 1)) {
    return { valid: false, error: "Strength must be between 0 and 1" };
  }
  if (
    inputs.num_inference_steps !== undefined &&
    (inputs.num_inference_steps < 2 || inputs.num_inference_steps > 250)
  ) {
    return { valid: false, error: "Inference steps must be between 2 and 250" };
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
      strength: inputs.strength ?? 0.8,
      num_inference_steps: inputs.num_inference_steps ?? 30,
      guidance_scale: inputs.guidance_scale ?? 2.5,
      output_format: inputs.output_format ?? "png",
      acceleration: inputs.acceleration ?? "none",
      enable_safety_checker: inputs.enable_safety_checker ?? true,
    },
  };

  // Add optional parameters only if provided
  if (inputs.negative_prompt) {
    payload.input.negative_prompt = inputs.negative_prompt;
  }
  if (inputs.seed !== undefined && inputs.seed !== null) {
    payload.input.seed = inputs.seed;
  }

  return payload;
}

export function calculateCost(_inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
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
