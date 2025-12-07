/** FLUX.1 Kontext Max (prompt_to_image) - Record: c1bd50df-1c27-48a3-8630-0970eedd21f6 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "flux-kontext-max",
  recordId: "c1bd50df-1c27-48a3-8630-0970eedd21f6",
  modelName: "FLUX.1 Kontext Max",
  provider: "kie_ai",
  contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 5,
  estimatedTimeSeconds: 50,
  costMultipliers: {},
  apiEndpoint: "/api/v1/flux/kontext/generate",
  payloadStructure: "flat",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/flux.png",
  modelFamily: "FLUX",
  variantName: "Flux Kontext Max",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/FLUX_1_Kontext_Max_prompt.ts",
} as const;

export const SCHEMA = {
  imageInputField: "inputImage",
  properties: {
    aspectRatio: { default: "16:9", enum: ["1:1", "3:4", "4:3", "9:16", "16:9", "21:9"], type: "string" },
    enableTranslation: { default: true, enum: [true, false], showToUser: false, type: "boolean" },
    inputImage: { renderer: "image", type: "string" },
    outputFormat: { default: "jpeg", enum: ["jpeg", "png"], type: "string" },
    prompt: { renderer: "prompt", type: "string" },
  },
  required: ["prompt"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" };
}
export function preparePayload(inputs: Record<string, any>) {
  return {
    prompt: inputs.prompt,
    inputImage: inputs.inputImage,
    aspectRatio: inputs.aspectRatio || "16:9",
    outputFormat: inputs.outputFormat || "jpeg",
    enableTranslation: true,
  };
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
