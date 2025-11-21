/** runware flux 1.1 pro (prompt_to_image) - Record: e9c7a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "runware:flux-1.1-pro", recordId: "e9c7a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e", modelName: "runware flux 1.1 pro", provider: "runware", contentType: "prompt_to_image", baseCreditCost: 0.25, estimatedTimeSeconds: 18, costMultipliers: {}, apiEndpoint: "https://api.runware.ai/v1", payloadStructure: "flat", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/public/logos/plum.png",
  modelFamily: "Runware",
  variantName: "flux 1.1 pro",
  displayOrderInFamily: 3,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/runware_flux_1_1_pro.ts" } as const;

export const SCHEMA = { properties: { positivePrompt: { renderer: "prompt", type: "string" }, outputFormat: { default: "PNG", enum: ["PNG", "JPEG", "WEBP"], type: "string" } }, required: ["positivePrompt", "outputFormat"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.positivePrompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { taskType: "imageInference", positivePrompt: inputs.positivePrompt, outputFormat: inputs.outputFormat || "PNG", numberResults: 1, width: 1024, height: 1024, steps: 4, outputType: ["URL"], includeCost: true }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { positivePrompt: prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: "pending", settings: modelParameters }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);
  const { data: keyData } = await supabase.functions.invoke('get-api-key', {
    body: { provider: MODEL_CONFIG.provider, modelId: MODEL_CONFIG.modelId, recordId: MODEL_CONFIG.recordId }
  });
  if (!keyData?.apiKey) throw new Error('Failed to retrieve API key');
  const apiKey = keyData.apiKey;
  const res = await fetch(MODEL_CONFIG.apiEndpoint, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify([preparePayload(inputs)]) });
  if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
  const result = await res.json();
  await supabase.from("generations").update({ provider_task_id: result[0]?.taskUUID, provider_request: preparePayload(inputs), provider_response: result }).eq("id", gen.id);
  startPolling(gen.id);
  return gen.id;
}

