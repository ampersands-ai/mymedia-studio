/** Sora 2 by OpenAI Watermarked (prompt_to_video) - Record: c6e5b4a3-5d2f-1c0e-6a9f-3d5b6c7e4a8f */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";

export const MODEL_CONFIG = { modelId: "sora-turbo-prompt-to-video", recordId: "c6e5b4a3-5d2f-1c0e-6a9f-3d5b6c7e4a8f", modelName: "Sora 2 by OpenAI (Watermarked)", provider: "kie_ai", contentType: "video", baseCreditCost: 80, estimatedTimeSeconds: 300, costMultipliers: {}, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 0, defaultOutputs: 1 } as const;

export const SCHEMA = { properties: { aspect_ratio: { default: "16:9", enum: ["16:9", "9:16", "1:1"], type: "string" }, loop: { default: false, enum: [true, false], type: "boolean" }, prompt: { maxLength: 5000, renderer: "prompt", type: "string" } }, required: ["prompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, aspect_ratio: inputs.aspect_ratio || "16:9", loop: inputs.loop || false } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
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
