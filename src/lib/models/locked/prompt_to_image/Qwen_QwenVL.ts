/** Qwen Text to Image (prompt_to_image) - Record: 36246bd4-f2e5-472b-bcf8-3dd99bc313d8 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "qwen/text-to-image",
  recordId: "36246bd4-f2e5-472b-bcf8-3dd99bc313d8",
  modelName: "Qwen",
  provider: "kie_ai",
  contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 0.5,
  estimatedTimeSeconds: 25,
  costMultipliers: {
    image_size: { square: 1, square_hd: 5, portrait_4_3: 3, portrait_16_9: 2, landscape_4_3: 3, landscape_16_9: 2 },
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/qwen.png",
  modelFamily: "Qwen",
  variantName: "Text to Image",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Qwen_QwenVL.ts",
} as const;

export const SCHEMA = {
  properties: {
    // Required
    prompt: {
      type: "string",
      maxLength: 5000,
      renderer: "prompt",
      description: "The prompt to generate the image with",
    },

    // Image size (replaces aspect_ratio)
    image_size: {
      type: "string",
      enum: ["square", "square_hd", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"],
      default: "square",
      description: "The size of the generated image",
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
  required: ["prompt"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) {
    return { valid: false, error: "Prompt is required" };
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
      image_size: inputs.image_size ?? "square",
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

export function calculateCost(inputs: Record<string, any>) {
  const imageSize = inputs.image_size || "square";
  const multiplier =
    MODEL_CONFIG.costMultipliers.image_size[imageSize as keyof typeof MODEL_CONFIG.costMultipliers.image_size] || 1;
  return MODEL_CONFIG.baseCreditCost * multiplier;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;

  const inputs: Record<string, any> = { prompt, ...modelParameters };

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
      settings: sanitizeForStorage(modelParameters),
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
    const errorMessage = await extractEdgeFunctionError(funcError);
    throw new Error(errorMessage);
  }

  startPolling(gen.id);
  return gen.id;
}
