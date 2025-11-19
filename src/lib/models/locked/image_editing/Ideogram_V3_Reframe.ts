/** Ideogram V3 Reframe (image_editing) - Record: 4c0b52d9-1dea-467e-8c96-1c7c9b24bf4a */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";

export const MODEL_CONFIG = { modelId: "ideogram/v3-reframe", recordId: "4c0b52d9-1dea-467e-8c96-1c7c9b24bf4a", modelName: "Ideogram V3 Reframe", provider: "kie_ai", contentType: "image", baseCreditCost: 2, estimatedTimeSeconds: 40, costMultipliers: { rendering_speed: { BALANCED:2, QUALITY:3, TURBO:1 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1 } as const;

export const SCHEMA = { imageInputField: "image_url", properties: { aspect_ratio: { default: "1:1", enum: ["1:1", "3:4", "4:3", "9:16", "16:9"], type: "string" }, expand_prompt: { default: true, enum: [true, false], type: "boolean" }, image_url: { renderer: "image", type: "string" }, negative_prompt: { maxLength: 5000, type: "string" }, prompt: { maxLength: 5000, type: "string" }, rendering_speed: { default: "TURBO", enum: ["TURBO", "BALANCED", "QUALITY"], type: "string" }, seed: { type: "integer" } }, required: ["image_url"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.image_url ? { valid: true } : { valid: false, error: "Image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { image_url: inputs.image_url, prompt: inputs.prompt, aspect_ratio: inputs.aspect_ratio || "1:1", rendering_speed: inputs.rendering_speed || "TURBO" } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost * (MODEL_CONFIG.costMultipliers.rendering_speed[inputs.rendering_speed || "TURBO"] || 1); }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) inputs.image_url = (await uploadImagesToStorage(userId))[0];
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: MODEL_CONFIG.contentType, prompt: prompt || "Reframe image", tokens_used: calculateCost(inputs), status: "pending", settings: modelParameters }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);
  const payload = preparePayload(inputs);
  const apiKey = await getKieApiKey();
  const res = await fetch(`https://api.kie.ai${MODEL_CONFIG.apiEndpoint}`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
  const result = await res.json();
  await supabase.from("generations").update({ provider_task_id: result.taskId || result.id, provider_request: payload, provider_response: result }).eq("id", gen.id);
  startPolling(gen.id);
  return gen.id;
}

async function getKieApiKey(): Promise<string> { throw new Error("KIE_API_KEY needs configuration"); }
