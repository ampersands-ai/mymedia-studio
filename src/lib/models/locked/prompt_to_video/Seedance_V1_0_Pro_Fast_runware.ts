/** Seedance V1.0 Pro Fast runware (prompt_to_video) - Record: 734c7712-aae3-4ad2-93b9-df198623503d */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "bytedance:2@2", recordId: "734c7712-aae3-4ad2-93b9-df198623503d", modelName: "Seedance V1.0 Pro Fast", provider: "runware", contentType: "prompt_to_video", baseCreditCost: 1.5, estimatedTimeSeconds: 30, costMultipliers: {}, apiEndpoint: "https://api.runware.ai/v1", payloadStructure: "wrapper", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  modelFamily: "Seedance",
  variantName: "Seedance V1.0 Pro Fast",
  displayOrderInFamily: 3,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Seedance_V1_0_Pro_Fast_runware.ts" } as const;

export const SCHEMA = { properties: { duration: { default: 5, maximum: 12, minimum: 2, title: "Duration (seconds)", type: "number" }, fps: { default: 24, maximum: 60, minimum: 12, title: "Frames Per Second", type: "number" }, height: { default: 736, showToUser: false, type: "number" }, includeCost: { default: true, showToUser: false, type: "boolean" }, numberResults: { default: 1, maximum: 4, minimum: 1, title: "number of videos", type: "number" }, outputFormat: { default: "mp4", enum: ["mp4", "webm", "mov"], type: "string" }, outputQuality: { default: 85, showToUser: false, type: "number" }, positivePrompt: { title: "Prompt", type: "string" }, providerSettings: { default: { bytedance: { cameraFixed: false } }, showToUser: false, type: "object" }, taskType: { default: "videoInference", showToUser: false, type: "string" }, width: { default: 544, showToUser: false, type: "number" } }, required: ["positivePrompt", "duration", "numberResults", "outputFormat"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.positivePrompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { taskType: "videoInference", positivePrompt: inputs.positivePrompt, duration: inputs.duration || 5, fps: inputs.fps || 24, width: 544, height: 736, outputFormat: inputs.outputFormat || "mp4", outputQuality: 85, numberResults: inputs.numberResults || 1, includeCost: true, providerSettings: { bytedance: { cameraFixed: false } } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost * (inputs.numberResults || 1); }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { positivePrompt: prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: MODEL_CONFIG.contentType, prompt, tokens_used: cost, status: "pending", settings: modelParameters }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);
  const apiKey = await getRunwareApiKey();
  const res = await fetch(MODEL_CONFIG.apiEndpoint, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify([preparePayload(inputs)]) });
  if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
  const result = await res.json();
  await supabase.from("generations").update({ provider_task_id: result[0]?.taskUUID, provider_request: preparePayload(inputs), provider_response: result }).eq("id", gen.id);
  startPolling(gen.id);
  return gen.id;
}

import { getRunwareApiKey as getCentralRunwareApiKey } from "../getRunwareApiKey";

async function getRunwareApiKey(): Promise<string> {
  return getCentralRunwareApiKey(MODEL_CONFIG.modelId, MODEL_CONFIG.recordId);
}
