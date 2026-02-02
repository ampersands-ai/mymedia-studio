/** FLUX.1 Kontext Pro prompt_to_image - Record: 94b43382-bf4b-490d-82b5-265d14473f9b */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";

export const MODEL_CONFIG = {
  modelId: "flux-kontext-pro",
  recordId: "94b43382-bf4b-490d-82b5-265d14473f9b",
  modelName: "FLUX.1 Kontext Pro",
  provider: "kie_ai",
  contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 2.5,
  estimatedTimeSeconds: 50,
  costMultipliers: {},
  apiEndpoint: "/api/v1/flux/kontext/generate",
  payloadStructure: "flat",
  maxImages: 1,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/flux.png",
  modelFamily: "FLUX",
  variantName: "Flux Kontext Pro",
  displayOrderInFamily: 3,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/FLUX_1_Kontext_Pro_prompt.ts",
} as const;

export const SCHEMA = {
  imageInputField: "inputImage",
  properties: {
    prompt: { renderer: "prompt", title: "Prompt", type: "string" },
    inputImage: { renderer: "image", title: "Input Image (Optional)", type: "string" },
    aspectRatio: {
      default: "16:9",
      enum: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
      enumLabels: {
        "21:9": "Ultra-wide (21:9)",
        "16:9": "Widescreen (16:9)",
        "4:3": "Standard (4:3)",
        "1:1": "Square (1:1)",
        "3:4": "Portrait (3:4)",
        "9:16": "Mobile Portrait (9:16)",
      },
      type: "string",
    },
    outputFormat: { default: "jpeg", enum: ["jpeg", "png"], type: "string" },
    promptUpsampling: { default: false, type: "boolean", showToUser: false },
    safetyTolerance: { default: 2, enum: [0, 1, 2, 3, 4, 5, 6], type: "integer", showToUser: false },
    enableTranslation: { default: true, type: "boolean", showToUser: false },
    uploadCn: { default: false, type: "boolean", showToUser: false },
    watermark: { type: "string", showToUser: false },
  },
  required: ["prompt"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    model: MODEL_CONFIG.modelId,
    prompt: inputs.prompt,
    aspectRatio: inputs.aspectRatio || "16:9",
    outputFormat: inputs.outputFormat || "jpeg",
    enableTranslation: inputs.enableTranslation !== false,
  };

  // Add optional parameters
  if (inputs.inputImage) payload.inputImage = inputs.inputImage;
  if (inputs.promptUpsampling) payload.promptUpsampling = inputs.promptUpsampling;
  if (inputs.safetyTolerance !== undefined) payload.safetyTolerance = inputs.safetyTolerance;
  if (inputs.uploadCn) payload.uploadCn = inputs.uploadCn;
  if (inputs.watermark) payload.watermark = inputs.watermark;

  return payload;
}

export function calculateCost(_inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) inputs.inputImage = (await uploadImagesToStorage(userId))[0];
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
      settings: sanitizeForStorage(modelParameters),
    })
    .select()
    .single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side
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
