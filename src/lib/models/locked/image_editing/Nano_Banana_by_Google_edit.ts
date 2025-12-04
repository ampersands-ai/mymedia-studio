/** Nano Banana by Google (image_editing) - Record: a70d01a3-05de-4918-b934-55a7e5e5d407 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";

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
  properties: {
    aspect_ratio: { default: "1:1", enum: ["1:1", "3:4", "4:3", "9:16", "16:9"], type: "string" },
    image_url: { renderer: "image", type: "string" },
    mask_url: { renderer: "image", type: "string" },
    number_of_images: { default: 1, maximum: 4, minimum: 1, type: "integer" },
    prompt: { maxLength: 5000, renderer: "prompt", type: "string" },
    seed: { type: "integer" },
  },
  required: ["prompt", "image_url"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (!inputs.image_url) return { valid: false, error: "Image required" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    modelId: MODEL_CONFIG.modelId,
    input: {
      prompt: inputs.prompt,
      image_url: inputs.image_url,
      aspect_ratio: inputs.aspect_ratio || "1:1",
      number_of_images: inputs.number_of_images || 1,
      ...(inputs.mask_url && { mask_url: inputs.mask_url }),
      ...(inputs.seed && { seed: inputs.seed }),
    },
  };
}

export function calculateCost(inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost * (inputs.number_of_images || 1);
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
  if (!imageUrls || imageUrls.length === 0) throw new Error("Failed to upload images");

  const inputs: Record<string, any> = {
    prompt,
    image_url: imageUrls[0],
    ...(imageUrls[1] && { mask_url: imageUrls[1] }),
    ...modelParameters,
  };

  const validation = validate(inputs);
  if (!validation.valid) throw new Error(validation.error);

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

  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

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
