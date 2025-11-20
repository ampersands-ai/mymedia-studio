/** Seedream V1 Pro (prompt_to_video) - Record: d7c6b5a4-6e3f-2c1d-7a0f-4d6b7c8e5a9f */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";

export const MODEL_CONFIG = { modelId: "seedream/v1-pro", recordId: "d7c6b5a4-6e3f-2c1d-7a0f-4d6b7c8e5a9f", modelName: "Seedream V1 Pro", provider: "kie_ai", contentType: "video", baseCreditCost: 25, estimatedTimeSeconds: 200, costMultipliers: {}, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 0, defaultOutputs: 1 } as const;

export const SCHEMA = { properties: { aspect_ratio: { default: "16:9", enum: ["16:9", "9:16", "1:1"], type: "string" }, prompt: { maxLength: 5000, renderer: "prompt", type: "string" } }, required: ["prompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, aspect_ratio: inputs.aspect_ratio || "16:9" } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: MODEL_CONFIG.contentType, prompt, tokens_used: calculateCost(inputs), status: "pending", settings: modelParameters }).select().single();
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

