/** WAN 2.2 Turbo (image_to_video) - Record: c9e5a7f3-8d4b-6f2c-9a8e-5d7b3c4f6a9e */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = { modelId: "wan/2-2-a14b-image-to-video-turbo", recordId: "e4ae6c36-dfcb-4fe4-94f3-46962df720b1", modelName: "WAN 2.2 Turbo", provider: "kie_ai", contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO", baseCreditCost: 15, estimatedTimeSeconds: 180, costMultipliers: {}, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/wan.png",
  modelFamily: "WAN",
  variantName: "WAN 2.2 Turbo",
  displayOrderInFamily: 1,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/WAN_2_2_Turbo.ts" } as const;

export const SCHEMA = { properties: { image_url: { type: "string" }, prompt: { maxLength: 5000, type: "string" } }, required: ["prompt", "image_url"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt && inputs.image_url ? { valid: true } : { valid: false, error: "Prompt and image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, image_url: inputs.image_url } }; }
export function calculateCost(_inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) inputs.image_url = (await uploadImagesToStorage(userId))[0];
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: GENERATION_STATUS.PENDING, settings: sanitizeForStorage(modelParameters) }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side (edge function will process)
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

