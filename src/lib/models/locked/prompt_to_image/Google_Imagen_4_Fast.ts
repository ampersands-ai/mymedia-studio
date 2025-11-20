/** Google Imagen 4 Fast (prompt_to_image) - Record: 0ff9bb96-041e-4c24-90c5-543064b642ca */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "google/imagen4-fast", recordId: "0ff9bb96-041e-4c24-90c5-543064b642ca", modelName: "Google Imagen 4 Fast", provider: "kie_ai", contentType: "prompt_to_image", baseCreditCost: 2, estimatedTimeSeconds: 25, costMultipliers: { num_images: { "1": 1, "2": 2, "3": 3, "4": 4 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/google.svg",
  modelFamily: "Google",
  variantName: "Imagen 4 Fast",
  displayOrderInFamily: 1,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Google_Imagen_4_Fast.ts" } as const;

export const SCHEMA = { properties: { aspect_ratio: { default: "1:1", enum: ["1:1", "3:4", "4:3", "9:16", "16:9"], type: "string" }, negative_prompt: { type: "string" }, num_images: { default: 1, enum: [1, 2, 3, 4], title: "Number of Outputs", type: "string" }, prompt: { renderer: "prompt", type: "string" }, seed: { type: "string" } }, required: ["prompt"], type: "object", "x-order": ["prompt", "num_images", "seed", "aspect_ratio", "negative_prompt"] } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, aspect_ratio: inputs.aspect_ratio || "1:1", num_images: inputs.num_images || 1, ...(inputs.seed && { seed: inputs.seed }), ...(inputs.negative_prompt && { negative_prompt: inputs.negative_prompt }) } }; }
export function calculateCost(inputs: Record<string, any>) { const numImages = parseInt(inputs.num_images || "1"); return MODEL_CONFIG.baseCreditCost * (MODEL_CONFIG.costMultipliers.num_images[numImages] || 1); }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: "pending", settings: modelParameters }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);
  const apiKey = await getKieApiKey();
  const res = await fetch(`https://api.kie.ai${MODEL_CONFIG.apiEndpoint}`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify(preparePayload(inputs)) });
  if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
  const result = await res.json();
  await supabase.from("generations").update({ provider_task_id: result.taskId || result.id, provider_request: preparePayload(inputs), provider_response: result }).eq("id", gen.id);
  startPolling(gen.id);
  return gen.id;
}

import { getKieApiKey as getCentralKieApiKey } from "../getKieApiKey";

async function getKieApiKey(): Promise<string> {
  return getCentralKieApiKey(MODEL_CONFIG.modelId, MODEL_CONFIG.recordId);
}
