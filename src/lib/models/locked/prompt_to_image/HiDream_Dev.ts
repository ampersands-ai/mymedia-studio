/** HiDream Dev (prompt_to_image) - Record: 79ce627d-f90c-47b2-ae3f-9437d93f4529 */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "runware:97@2", recordId: "79ce627d-f90c-47b2-ae3f-9437d93f4529", modelName: "HiDream Dev", provider: "runware", contentType: "prompt_to_image", baseCreditCost: 0.5, estimatedTimeSeconds: 15, costMultipliers: {}, apiEndpoint: "https://api.runware.ai/v1", payloadStructure: "direct", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/public/logos/hidream.png",
  modelFamily: "HiDream",
  variantName: "Dev",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/HiDream_Dev.ts" } as const;

export const SCHEMA = { properties: { CFGScale: { default: 1, showToUser: false, type: "number" }, checkNSFW: { default: true, showToUser: false, type: "boolean" }, height: { default: 1152, showToUser: false, type: "number" }, includeCost: { default: true, showToUser: false, type: "boolean" }, numberResults: { default: 1, showToUser: false, title: "number of images", type: "number" }, outputFormat: { default: "WEBP", enum: ["PNG", "JPG", "WEBP"], showToUser: false, type: "string" }, outputType: { default: "URL", showToUser: false, type: "string" }, positivePrompt: { renderer: "prompt", type: "string" }, taskType: { default: "imageInference", showToUser: false, type: "string" }, taskUUID: { showToUser: false, type: "string" }, uploadEndpoint: { showToUser: false, type: "string" }, width: { default: 896, showToUser: false, type: "number" } }, required: ["positivePrompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.positivePrompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return [{ taskType: "imageInference", taskUUID: inputs.taskUUID || crypto.randomUUID(), model: MODEL_CONFIG.modelId, positivePrompt: inputs.positivePrompt, height: inputs.height || 1152, width: inputs.width || 896, numberResults: inputs.numberResults || 1, outputType: inputs.outputType || "URL", outputFormat: inputs.outputFormat || "WEBP", includeCost: true, checkNSFW: true, CFGScale: inputs.CFGScale || 1, ...(inputs.uploadEndpoint && { uploadEndpoint: inputs.uploadEndpoint }) }]; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { positivePrompt: prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: "pending", settings: modelParameters }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);
  const apiKey = await getRunwareApiKey();
  const res = await fetch(MODEL_CONFIG.apiEndpoint, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify(preparePayload(inputs)) });
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
