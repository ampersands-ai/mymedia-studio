/** Nano Banana by Google (image_editing) - Record: a70d01a3-05de-4918-b934-55a7e5e5d407 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "google/nano-banana-edit",
  recordId: "a70d01a3-05de-4918-b934-55a7e5e5d407",
  modelName: "Nano Banana by Google",
  provider: "kie_ai",
  contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_EDITING",
  baseCreditCost: 2,
  estimatedTimeSeconds: 25,
  costMultipliers: {},
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 10,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/google.png",
  modelFamily: "Google",
  variantName: "Nano Banana",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Nano_Banana_by_Google_edit.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_urls",
  properties: {
    // ============ MAIN UI PARAMETERS ============
    prompt: {
      type: "string",
      maxLength: 5000,
      renderer: "prompt",
      description: "The prompt for image editing",
    },
    image_urls: {
      type: "array",
      renderer: "image",
      maxItems: 10,
      description:
        "List of URLs of input images for editing, up to 10 images. Accepted types: image/jpeg, image/png, image/webp. Max size: 10MB",
    },
    image_size: {
      type: "string",
      enum: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "auto"],
      default: "1:1",
      description: "Aspect ratio for the generated image",
    },
    output_format: {
      type: "string",
      enum: ["png", "jpeg"],
      default: "png",
      description: "Output format for the images",
    },
  },
  required: ["prompt", "image_urls"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) {
    return { valid: false, error: "Prompt is required" };
  }
  if (!inputs.image_urls || (Array.isArray(inputs.image_urls) && inputs.image_urls.length === 0)) {
    return { valid: false, error: "At least one image is required" };
  }
  if (inputs.prompt.length > 5000) {
    return { valid: false, error: "Prompt must be 5000 characters or less" };
  }
  if (Array.isArray(inputs.image_urls) && inputs.image_urls.length > 10) {
    return { valid: false, error: "Maximum 10 images allowed" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  // Ensure image_urls is an array
  const imageUrls = Array.isArray(inputs.image_urls) ? inputs.image_urls : [inputs.image_urls];

  return {
    model: MODEL_CONFIG.modelId,
    input: {
      prompt: inputs.prompt,
      image_urls: imageUrls,
      image_size: inputs.image_size ?? "1:1",
      output_format: inputs.output_format ?? "png",
    },
  };
}

export function calculateCost(_inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const {
    prompt,
    modelParameters,
    userId,
    uploadedImages: _uploadedImages,
    uploadImagesToStorage,
    startPolling,
  } = params;

  // Upload images to storage first
  const imageUrls = await uploadImagesToStorage(userId);
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error("Failed to upload images");
  }

  const inputs: Record<string, any> = {
    prompt,
    image_urls: imageUrls, // Array of image URLs
    ...modelParameters,
  };

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
    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  startPolling(gen.id);
  return gen.id;
}
