/** Seedance V1 Lite (image_to_video) - Record: f3c7e9a2-4d5b-6f8c-9a1e-3b7d5c8f4a6e */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "bytedance/v1-lite-image-to-video", recordId: "d7df81f6-dc86-4e04-9f75-d4e8c9b03fb2", modelName: "Seedance V1 Lite", provider: "kie_ai", contentType: "video", baseCreditCost: 2, estimatedTimeSeconds: 300, costMultipliers: { duration: { "3": 1, "4": 1.33, "5": 1.66, "6": 2, "7": 2.33, "8": 2.66, "9": 3, "10": 3.33, "11": 3.66, "12": 4 }, resolution: { "480p": 1, "720p": 2.5, "1080p": 5 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  modelFamily: "Seedance",
  variantName: "Seedance V1 Lite",
  displayOrderInFamily: 1,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Seedance_V1_Lite.ts" } as const;

export const SCHEMA = { properties: { aspect_ratio: { default: "3:4", enum: ["1:1", "3:4", "4:3", "9:16", "16:9", "9:21"], type: "string" }, duration: { default: "3", enum: ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], type: "string" }, image_url: { type: "string" }, prompt: { type: "string" }, resolution: { default: "480p", enum: ["480p", "720p", "1080p"], type: "string" } }, required: ["prompt", "image_url"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt && inputs.image_url ? { valid: true } : { valid: false, error: "Prompt and image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, image_url: inputs.image_url, duration: inputs.duration || "3", resolution: inputs.resolution || "480p", aspect_ratio: inputs.aspect_ratio || "3:4" } }; }
export function calculateCost(inputs: Record<string, any>) { const dur = parseInt(inputs.duration || "3"); const durMult = MODEL_CONFIG.costMultipliers.duration[dur] || 1; const resMult = MODEL_CONFIG.costMultipliers.resolution[inputs.resolution || "480p"] || 1; return MODEL_CONFIG.baseCreditCost * durMult * resMult; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) inputs.image_url = (await uploadImagesToStorage(userId))[0];
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: MODEL_CONFIG.contentType, prompt, tokens_used: cost, status: "pending", settings: modelParameters }).select().single();
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
