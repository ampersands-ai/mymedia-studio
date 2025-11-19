/** Seedream V4 (image_editing) - Record: d2ffb834-fc59-4c80-bf48-c2cc25281fdd */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";

export const MODEL_CONFIG = { modelId: "bytedance/seedream-v4-image-edit", recordId: "57f1e8f3-e4e3-42bd-bd9e-2f2ac6eee41d", modelName: "Seedream V4", provider: "kie_ai", contentType: "image", baseCreditCost: 1, estimatedTimeSeconds: 40, costMultipliers: {}, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1 } as const;

export const SCHEMA = { imageInputField: "image_url", properties: { aspect_ratio: { default: "1:1", enum: ["1:1", "3:4", "4:3", "9:16", "16:9"], type: "string" }, enable_safety_checker: { default: true, enum: [true, false], type: "boolean" }, image_url: { renderer: "image", type: "string" }, negative_prompt: { maxLength: 5000, type: "string" }, prompt: { maxLength: 5000, type: "string" }, resolution: { default: "480p", enum: ["480p", "720p", "1080p"], type: "string" }, seed: { type: "integer" }, strength: { default: 0.7, maximum: 1, minimum: 0, type: "number" } }, required: ["prompt", "image_url"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt && inputs.image_url ? { valid: true } : { valid: false, error: "Prompt and image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, image_url: inputs.image_url, strength: inputs.strength || 0.7, aspect_ratio: inputs.aspect_ratio || "1:1", resolution: inputs.resolution || "480p" } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) inputs.image_url = (await uploadImagesToStorage(userId))[0];
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: MODEL_CONFIG.contentType, prompt, tokens_used: calculateCost(inputs), status: "pending", settings: modelParameters }).select().single();
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
