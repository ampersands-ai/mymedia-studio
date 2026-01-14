/** Seedance V1.0 Pro Fast runware (image_to_video) - Record: f8a6c4e9-7d3b-5f9c-8a2e-6d4b7c5f9a3e */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { API_ENDPOINTS } from "@/lib/config/api-endpoints";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "bytedance:2@2",
  recordId: "3ac57af3-f7f0-4205-b1a4-3c7c3c1c7dad",
  modelName: "Seedance V1.0 Pro Fast",
  provider: "runware",
  contentType: "image_to_video",
  use_api_key: "RUNWARE_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 3.5,
  estimatedTimeSeconds: 30,
  costMultipliers: {},
  apiEndpoint: API_ENDPOINTS.RUNWARE.fullUrl,
  payloadStructure: "flat",
  maxImages: 1,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/seedream.png",
  modelFamily: "Seedance",
  variantName: "Seedance V1 Pro Fast",
  displayOrderInFamily: 3,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Seedance_V1_0_Pro_Fast_runware.ts",
} as const;

export const SCHEMA = {
  properties: {
    duration: { default: 5, maximum: 12, minimum: 2, type: "number" },
    fps: { default: 24, maximum: 60, minimum: 12, type: "number" },
    height: { default: 736, showToUser: false, type: "number" },
    includeCost: { default: true, showToUser: false, type: "boolean" },
    inputImage: { renderer: "image", type: "string" },
    outputFormat: { default: "MP4", enum: ["MP4", "GIF"], type: "string" },
    outputType: { default: ["URL"], items: { format: "uri", type: "string" }, showToUser: false, type: "array" },
    positivePrompt: { renderer: "prompt", type: "string" },
    taskType: { default: "imageToVideo", showToUser: false, type: "string" },
    width: { default: 1280, showToUser: false, type: "number" },
  },
  required: ["positivePrompt", "inputImage"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  return inputs.positivePrompt && inputs.inputImage
    ? { valid: true }
    : { valid: false, error: "Prompt and image required" };
}
export function preparePayload(inputs: Record<string, any>) {
  return {
    taskType: "imageToVideo",
    positivePrompt: inputs.positivePrompt,
    inputImage: inputs.inputImage,
    duration: inputs.duration || 5,
    fps: inputs.fps || 24,
    width: 1280,
    height: 736,
    outputFormat: inputs.outputFormat || "MP4",
    outputType: ["URL"],
    includeCost: true,
  };
}
export function calculateCost(_inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
}

// ============================================================================
// STORYBOARD DEFAULTS - Exact parameters for storyboard generation
// ============================================================================

import type { StoryboardContext, StoryboardDefaults } from "@/lib/models/types/storyboard";

const DIMENSION_PRESETS = {
  "9:16": { width: 736, height: 1280 },
  "16:9": { width: 1280, height: 736 },
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
} as const;

/**
 * Returns exact provider-ready parameters for storyboard I2V generation.
 * Only includes parameters that Runware actually accepts for this model.
 */
export function getStoryboardDefaults(ctx: StoryboardContext): StoryboardDefaults {
  const aspectRatio = (ctx.aspectRatio || "16:9") as keyof typeof DIMENSION_PRESETS;
  const dimensions = DIMENSION_PRESETS[aspectRatio] || DIMENSION_PRESETS["16:9"];

  return {
    taskType: "imageToVideo",
    positivePrompt: ctx.prompt || "",
    inputImage: ctx.inputImage || "",
    width: dimensions.width,
    height: dimensions.height,
    duration: ctx.duration || 5,
    fps: 24,
    outputFormat: "MP4",
    outputType: ["URL"],
    includeCost: true,
  };
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { ...modelParameters, positivePrompt: prompt };
  if (uploadedImages.length > 0) inputs.inputImage = (await uploadImagesToStorage(userId))[0]; // (edge function will process)
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
