/** Kling V2 Standard (image_to_video) - Record: a2f3b7e9-5c8d-4f6a-9e1b-3d7c8a4f5e6b */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";

export const MODEL_CONFIG = { modelId: "kling/v2-1-standard", recordId: "a2f3b7e9-5c8d-4f6a-9e1b-3d7c8a4f5e6b", modelName: "Kling V2 Standard", provider: "kie_ai", contentType: "video", baseCreditCost: 6, estimatedTimeSeconds: 300, costMultipliers: { duration: { 10: 2, 5: 1 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1 } as const;

export const SCHEMA = { properties: { duration: { default: "5", enum: ["5", "10"], type: "string" }, image_url: { type: "string" }, negative_prompt: { default: "blur, distort, and low quality", type: "string" }, prompt: { type: "string" } }, required: ["prompt", "image_url"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt && inputs.image_url ? { valid: true } : { valid: false, error: "Prompt and image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, image_url: inputs.image_url, duration: inputs.duration || "5", negative_prompt: inputs.negative_prompt || "blur, distort, and low quality" } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost * (MODEL_CONFIG.costMultipliers.duration[parseInt(inputs.duration || "5")] || 1); }

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

async function getKieApiKey(): Promise<string> { throw new Error("KIE_API_KEY needs configuration"); }
