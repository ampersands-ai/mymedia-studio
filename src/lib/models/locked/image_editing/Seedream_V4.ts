/** Seedream V4 (image_editing) - Record: d2ffb834-fc59-4c80-bf48-c2cc25281fdd */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "bytedance/seedream-v4-edit", // Fixed: was "bytedance/seedream-v4-image-edit"
  recordId: "57f1e8f3-e4e3-42bd-bd9e-2f2ac6eee41d",
  modelName: "Seedream V4",
  provider: "kie_ai",
  contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_EDITING",
  baseCreditCost: 1,
  estimatedTimeSeconds: 40,
  costMultipliers: {},
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 10, // API supports up to 10 input images
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/seedream.png",
  modelFamily: "Seedream",
  variantName: "Seedream V4",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Seedream_V4.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_urls",
  properties: {
    // Required parameters
    prompt: {
      type: "string",
      maxLength: 5000,
      description: "The text prompt used to edit the image",
    },
    image_urls: {
      type: "array",
      renderer: "image",
      items: { type: "string", format: "uri" },
      maxItems: 10,
      description: "List of URLs of input images for editing. Up to 10 images allowed.",
    },

    // Optional parameters
    image_size: {
      type: "string",
      default: "square",
      enum: [
        "square",
        "square_hd",
        "portrait_4_3",
        "portrait_3_2",
        "portrait_16_9",
        "landscape_4_3",
        "landscape_3_2",
        "landscape_16_9",
        "landscape_21_9",
      ],
      enumLabels: {
        square: "Square",
        square_hd: "Square HD",
        portrait_4_3: "Portrait 3:4",
        portrait_3_2: "Portrait 2:3",
        portrait_16_9: "Portrait 9:16",
        landscape_4_3: "Landscape 4:3",
        landscape_3_2: "Landscape 3:2",
        landscape_16_9: "Landscape 16:9",
        landscape_21_9: "Landscape 21:9",
      },
      description: "The size/aspect ratio of the generated image",
    },
    image_resolution: {
      type: "string",
      default: "1K",
      enum: ["1K", "2K", "4K"],
      description:
        "Final image resolution. Combined with image_size to determine pixel dimensions (e.g., 4:3 + 4K = 4096×3072px)",
    },
    max_images: {
      type: "integer",
      minimum: 1,
      maximum: 6,
      default: 1,
      description:
        "Number of images to generate (1-6). State the exact number in your prompt for best results.",
    },
    seed: {
      type: "integer",
      description: "Random seed to control the stochasticity of image generation",
    },
  },
  required: ["prompt", "image_urls"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) {
    return { valid: false, error: "Prompt is required" };
  }
  if (!inputs.image_urls || !Array.isArray(inputs.image_urls) || inputs.image_urls.length === 0) {
    return { valid: false, error: "At least one image URL is required" };
  }
  if (inputs.image_urls.length > 10) {
    return { valid: false, error: "Maximum 10 images allowed" };
  }
  if (inputs.max_images !== undefined && (inputs.max_images < 1 || inputs.max_images > 6)) {
    return { valid: false, error: "max_images must be between 1 and 6" };
  }
  if (
    inputs.image_size !== undefined &&
    ![
      "square",
      "square_hd",
      "portrait_4_3",
      "portrait_3_2",
      "portrait_16_9",
      "landscape_4_3",
      "landscape_3_2",
      "landscape_16_9",
      "landscape_21_9",
    ].includes(inputs.image_size)
  ) {
    return { valid: false, error: "Invalid image_size value" };
  }
  if (inputs.image_resolution !== undefined && !["1K", "2K", "4K"].includes(inputs.image_resolution)) {
    return { valid: false, error: "image_resolution must be 1K, 2K, or 4K" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    model: MODEL_CONFIG.modelId, // Fixed: was "modelId"
    input: {
      prompt: inputs.prompt,
      image_urls: inputs.image_urls,
      image_size: inputs.image_size || "square",
      image_resolution: inputs.image_resolution || "1K",
      max_images: inputs.max_images || 1,
    },
  };

  // Add optional seed if provided
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

  // Upload images and get URLs if provided
  if (uploadedImages.length > 0) {
    inputs.image_urls = await uploadImagesToStorage(userId);
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
      settings: sanitizeForStorage(modelParameters),
    })
    .select()
    .single();

  if (error || !gen) {
    throw new Error(`Failed: ${error?.message}`); // Fixed: was Error`Failed...`
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
    throw new Error(`Edge function failed: ${funcError.message}`); // Fixed: was Error`Edge...`
  }

  startPolling(gen.id);
  return gen.id;
}
