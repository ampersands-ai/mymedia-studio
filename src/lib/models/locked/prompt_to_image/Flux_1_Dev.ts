/** Flux.1 Dev (prompt_to_image) - Record: f311e8bd-d7a8-4f81-b186-3ac6a5aefe8c */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";

export const MODEL_CONFIG = { modelId: "runware:101@1", recordId: "f311e8bd-d7a8-4f81-b186-3ac6a5aefe8c", modelName: "Flux.1 Dev", provider: "runware", contentType: "image", baseCreditCost: 0.4, estimatedTimeSeconds: 15, costMultipliers: {}, apiEndpoint: "https://api.runware.ai/v1", payloadStructure: "flat", maxImages: 0, defaultOutputs: 1 } as const;

export const SCHEMA = { properties: { CFGScale: { default: 3.5, showToUser: false, type: "number" }, checkNSFW: { default: true, showToUser: false, type: "boolean" }, height: { default: 1152, showToUser: false, type: "number" }, includeCost: { default: true, showToUser: false, type: "boolean" }, numberResults: { default: 1, showToUser: false, title: "number of images", type: "number" }, outputFormat: { default: "WEBP", enum: ["WEBP", "JPEG", "PNG"], title: "Output Format", type: "string" }, outputQuality: { default: 85, showToUser: false, type: "number" }, outputType: { default: ["URL"], items: { format: "uri", type: "string" }, showToUser: false, type: "array" }, positivePrompt: { renderer: "prompt", type: "string" }, scheduler: { default: "FlowMatchEulerDiscreteScheduler", showToUser: false, type: "string" }, steps: { default: 28, showToUser: false, type: "number" }, taskType: { default: "imageInference", showToUser: false, type: "string" }, width: { default: 896, showToUser: false, type: "number" } }, required: ["positivePrompt", "numberResults", "outputFormat"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.positivePrompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { taskType: "imageInference", positivePrompt: inputs.positivePrompt, numberResults: inputs.numberResults || 1, outputFormat: inputs.outputFormat || "WEBP", width: 896, height: 1152, steps: 28, CFGScale: 3.5, scheduler: "FlowMatchEulerDiscreteScheduler", includeCost: true, checkNSFW: true, outputType: ["URL"], outputQuality: 85 }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { positivePrompt: prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: MODEL_CONFIG.contentType, prompt, tokens_used: calculateCost(inputs), status: "pending", settings: modelParameters }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);
  const apiKey = await getRunwareApiKey();
  const res = await fetch(MODEL_CONFIG.apiEndpoint, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify([preparePayload(inputs)]) });
  if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
  const result = await res.json();
  await supabase.from("generations").update({ provider_task_id: result[0]?.taskUUID, provider_request: preparePayload(inputs), provider_response: result }).eq("id", gen.id);
  startPolling(gen.id);
  return gen.id;
}

async function getRunwareApiKey(): Promise<string> { throw new Error("RUNWARE_API_KEY needs configuration"); }
