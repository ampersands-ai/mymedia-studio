/** Ideogram V3 Reframe (image_editing) - Record: 4c0b52d9-1dea-467e-8c96-1c7c9b24bf4a */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";

export const MODEL_CONFIG = { modelId: "ideogram/v3-reframe", recordId: "2c4802d0-f805-4c31-bab1-a07675e003eb", modelName: "Ideogram V3 Reframe", provider: "kie_ai", contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_EDITING", baseCreditCost: 1.75, estimatedTimeSeconds: 60, costMultipliers: { num_images: { "1": 1, "2": 2, "3": 3, "4": 4 }, rendering_speed: { BALANCED: 2, QUALITY: 3, TURBO: 1 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/ideogram.png",
  modelFamily: "Ideogram",
  variantName: "V3 Reframe",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Ideogram_V3_Reframe.ts" } as const;

export const SCHEMA = { imageInputField: "image_url", properties: { aspect_ratio: { default: "1:1", enum: ["1:1", "3:4", "4:3", "9:16", "16:9"], type: "string" }, expand_prompt: { default: true, enum: [true, false], type: "boolean" }, image_url: { renderer: "image", type: "string" }, negative_prompt: { maxLength: 5000, type: "string" }, prompt: { maxLength: 5000, type: "string" }, rendering_speed: { default: "TURBO", enum: ["TURBO", "BALANCED", "QUALITY"], type: "string" }, seed: { type: "integer" } }, required: ["image_url"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.image_url ? { valid: true } : { valid: false, error: "Image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { image_url: inputs.image_url, prompt: inputs.prompt, aspect_ratio: inputs.aspect_ratio || "1:1", rendering_speed: inputs.rendering_speed || "TURBO" } }; }
export function calculateCost(inputs: Record<string, any>) { const speedKey = (inputs.rendering_speed || "TURBO") as keyof typeof MODEL_CONFIG.costMultipliers.rendering_speed; return MODEL_CONFIG.baseCreditCost * (MODEL_CONFIG.costMultipliers.rendering_speed[speedKey] || 1); }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) inputs.image_url = (await uploadImagesToStorage(userId))[0];
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);

  // Create generation record with pending status (edge function will process)
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt: prompt || "Reframe image", tokens_used: cost, status: GENERATION_STATUS.PENDING, settings: modelParameters }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side
  // This keeps API keys secure and avoids CORS issues
  const { error: funcError } = await supabase.functions.invoke('generate-content', {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt: prompt || "Reframe image",
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
