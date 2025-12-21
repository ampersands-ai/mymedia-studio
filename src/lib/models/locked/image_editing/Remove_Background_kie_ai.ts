/** Remove Background kie_ai (image_editing) - Record: 0c77b10f-7b51-45fe-9e4e-cb30ebd61819 */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = { modelId: "recraft/remove-background", recordId: "58b8b09f-57fd-42e3-ae2d-689e9ea3064d", modelName: "Remove Background", provider: "kie_ai", contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_EDITING", baseCreditCost: 0.5, estimatedTimeSeconds: 20, costMultipliers: {}, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/plum.png",
  modelFamily: "Recraft",
  variantName: "Remove Background",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Remove_Background_kie_ai.ts" } as const;

export const SCHEMA = { imageInputField: "image", properties: { image: { renderer: "image", type: "string" } }, required: ["image"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.image ? { valid: true } : { valid: false, error: "Image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { image: inputs.image } }; }
export function calculateCost(_inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { ...modelParameters };
  if (uploadedImages.length > 0) inputs.image = (await uploadImagesToStorage(userId))[0];
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);

  // Create generation record with pending status (edge function will process)
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt: prompt || "Remove background", tokens_used: cost, status: GENERATION_STATUS.PENDING, settings: sanitizeForStorage(modelParameters) }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side
  // This keeps API keys secure and avoids CORS issues
  const { error: funcError } = await supabase.functions.invoke('generate-content', {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt: prompt || "Remove background",
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

