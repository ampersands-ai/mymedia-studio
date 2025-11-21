/** runware upscale (image_editing) - Record: e8c4a9f2-6b7d-4e3a-9c1f-5d8b7a3e6f2c */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "runware:105@1", recordId: "de96f11c-bc91-4cdd-ae71-0308e7584f8a", modelName: "runware upscale", provider: "runware", contentType: "image_editing", baseCreditCost: 20, estimatedTimeSeconds: 90, costMultipliers: { upscaleFactor: { "2": 1, "3": 1.5, "4": 2 } }, apiEndpoint: "https://api.runware.ai/v1", payloadStructure: "flat", maxImages: 1, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/plum.png",
  modelFamily: "Runware",
  variantName: "upscale",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/runware_upscale.ts" } as const;

export const SCHEMA = { imageInputField: "inputImage", properties: { includeCost: { default: true, showToUser: false, type: "boolean" }, inputImage: { renderer: "image", type: "string" }, outputFormat: { default: "PNG", enum: ["PNG", "JPEG", "WEBP"], type: "string" }, outputType: { default: ["URL"], items: { format: "uri", type: "string" }, showToUser: false, type: "array" }, taskType: { default: "imageUpscale", showToUser: false, type: "string" }, upscaleFactor: { default: 4, enum: [2, 4], type: "number" } }, required: ["inputImage"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.inputImage ? { valid: true } : { valid: false, error: "Image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { taskType: "imageUpscale", inputImage: inputs.inputImage, upscaleFactor: inputs.upscaleFactor || 4, outputFormat: inputs.outputFormat || "PNG", outputType: ["URL"], includeCost: true }; }
export function calculateCost(inputs: Record<string, any>) { const base = MODEL_CONFIG.baseCreditCost; const upscaleMult = MODEL_CONFIG.costMultipliers.upscaleFactor?.[String(inputs.upscaleFactor || 4)] || 1; return base * upscaleMult; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { ...modelParameters };
  if (uploadedImages.length > 0) inputs.inputImage = (await uploadImagesToStorage(userId))[0];
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt: prompt || "Upscale image", tokens_used: cost, status: "pending", settings: modelParameters }).select().single();
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
