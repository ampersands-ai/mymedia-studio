/** Remove Background kie_ai (image_editing) - Record: 0c77b10f-7b51-45fe-9e4e-cb30ebd61819 */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "recraft/remove-background", recordId: "58b8b09f-57fd-42e3-ae2d-689e9ea3064d", modelName: "Remove Background", provider: "kie_ai", contentType: "image", baseCreditCost: 0.5, estimatedTimeSeconds: 20, costMultipliers: {}, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  modelFamily: "KIE AI",
  variantName: "Remove Background",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Remove_Background_kie_ai.ts" } as const;

export const SCHEMA = { imageInputField: "image", properties: { image: { renderer: "image", type: "string" } }, required: ["image"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.image ? { valid: true } : { valid: false, error: "Image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { image: inputs.image } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { ...modelParameters };
  if (uploadedImages.length > 0) inputs.image = (await uploadImagesToStorage(userId))[0];
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: MODEL_CONFIG.contentType, prompt: prompt || "Remove background", tokens_used: cost, status: "pending", settings: modelParameters }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);
  const { data: keyData } = await supabase.functions.invoke('get-api-key', {
    body: { modelId: MODEL_CONFIG.modelId, recordId: MODEL_CONFIG.recordId }
  });
  if (!keyData?.apiKey) throw new Error('Failed to retrieve API key');
  const apiKey = keyData.apiKey;
  const res = await fetch(`https://api.kie.ai${MODEL_CONFIG.apiEndpoint}`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify(preparePayload(inputs)) });
  if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
  const result = await res.json();
  await supabase.from("generations").update({ provider_task_id: result.taskId || result.id, provider_request: preparePayload(inputs), provider_response: result }).eq("id", gen.id);
  startPolling(gen.id);
  return gen.id;
}

