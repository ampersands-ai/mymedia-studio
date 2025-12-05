/** Ideogram Image Remix (image_editing) - Record: fa2d60c2-4fc5-4d77-bc60-36e10dbf9e2b */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = { modelId: "ideogram/v3-remix", recordId: "922ca567-5aa1-4fd3-86ba-587b723a5dbf", modelName: "Ideogram Image Remix", provider: "kie_ai", contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_EDITING", baseCreditCost: 1.75, estimatedTimeSeconds: 60, costMultipliers: { num_images: { "1": 1, "2": 2, "3": 3, "4": 4 }, rendering_speed: { BALANCED: 2, QUALITY: 3, TURBO: 1 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/ideogram.png",
  modelFamily: "Ideogram",
  variantName: "Image Remix",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Ideogram_Image_Remix.ts" } as const;

export const SCHEMA = { imageInputField: "image_url", properties: { expand_prompt: { default: true, enum: [true, false], type: "boolean" }, image_size: { default: "square", enum: ["square", "square_hd", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"], type: "string" }, image_url: { renderer: "image", type: "string" }, image_weight: { default: 50, maximum: 100, minimum: 0, type: "integer" }, negative_prompt: { maxLength: 5000, type: "string" }, num_images: { default: "1", enum: ["1", "2", "3", "4"], type: "string" }, prompt: { type: "string" }, rendering_speed: { default: "TURBO", enum: ["TURBO", "BALANCED", "QUALITY"], type: "string" }, seed: { type: "integer" }, style: { default: "AUTO", enum: ["AUTO", "REALISTIC", "FICTION"], type: "string" } }, required: ["prompt", "image_url"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt && inputs.image_url ? { valid: true } : { valid: false, error: "Missing required fields" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, image_url: inputs.image_url, image_weight: inputs.image_weight || 50, style: inputs.style || "AUTO", rendering_speed: inputs.rendering_speed || "TURBO", image_size: inputs.image_size || "square", num_images: inputs.num_images || "1" } }; }
export function calculateCost(inputs: Record<string, any>) { const base = MODEL_CONFIG.baseCreditCost; const numImagesKey = String(parseInt(inputs.num_images || "1")) as keyof typeof MODEL_CONFIG.costMultipliers.num_images; const numImagesMult = MODEL_CONFIG.costMultipliers.num_images?.[numImagesKey] || 1; const speedKey = (inputs.rendering_speed || "TURBO") as keyof typeof MODEL_CONFIG.costMultipliers.rendering_speed; const speedMult = MODEL_CONFIG.costMultipliers.rendering_speed?.[speedKey] || 1; return base * numImagesMult * speedMult; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) inputs.image_url = (await uploadImagesToStorage(userId))[0];
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);

  // Create generation record with pending status (edge function will process)
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: GENERATION_STATUS.PENDING, settings: sanitizeForStorage(modelParameters) }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side
  // This keeps API keys secure and avoids CORS issues
  const { error: funcError } = await supabase.functions.invoke('generate-content', {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt,
      custom_parameters: preparePayload(inputs)
    }
  });

  if (funcError) {
    await supabase.from('generations').update({ status: GENERATION_STATUS.FAILED }).eq('id', gen.id);
    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  startPolling(gen.id);
  return gen.id;
}
