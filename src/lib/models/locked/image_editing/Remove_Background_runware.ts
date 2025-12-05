/** Remove Background runware (image_editing) - Record: d2f8b5e4-3a9c-4c72-8f61-2e4d9a7b6c3f */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { API_ENDPOINTS } from "@/lib/config/api-endpoints";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "runware:110@1",
  recordId: "d1d8b152-e123-4375-8f55-c0d0a699009b",
  modelName: "Remove Background",
  provider: "runware",
  contentType: "image_editing",
  use_api_key: "RUNWARE_API_KEY_IMAGE_EDITING",
  baseCreditCost: 0.06,
  estimatedTimeSeconds: 15,
  costMultipliers: {},
  apiEndpoint: API_ENDPOINTS.RUNWARE.fullUrl,
  payloadStructure: "flat",
  maxImages: 1,
  defaultOutputs: 1,

  // UI metadata
  isActive: true,
  logoUrl: "/logos/artifio.png",
  modelFamily: "Artifio",
  variantName: "Remove Background",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Remove_Background_runware.ts",
} as const;

export const SCHEMA = {
  imageInputField: "inputImage",
  properties: {
    includeCost: {
      default: true,
      showToUser: false,
      type: "boolean",
    },
    inputImage: {
      renderer: "image",
      type: "string",
    },
    outputFormat: {
      default: "PNG",
      enum: ["PNG", "JPEG", "WEBP"],
      type: "string",
    },
    outputType: {
      default: ["URL"],
      items: {
        format: "uri",
        type: "string",
      },
      showToUser: false,
      type: "array",
    },
    taskType: {
      default: "imageBackgroundRemoval",
      showToUser: false,
      type: "string",
    },
  },
  required: ["inputImage"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  return inputs.inputImage ? { valid: true } : { valid: false, error: "Image required" };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    taskType: "imageBackgroundRemoval",
    inputImage: inputs.inputImage,
    outputFormat: inputs.outputFormat || "PNG",
    outputType: ["URL"],
    includeCost: true,
  };
}

export function calculateCost(_inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;

  const inputs: Record<string, any> = { ...modelParameters };

  if (uploadedImages.length > 0) {
    inputs.inputImage = (await uploadImagesToStorage(userId))[0];
  }

  const validation = validate(inputs);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);

  const { data: gen, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: getGenerationType(MODEL_CONFIG.contentType),
      prompt: prompt || "Remove background",
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
      prompt: prompt || "Remove background",
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
