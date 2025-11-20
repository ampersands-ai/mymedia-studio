/** Ideogram Character (image_editing) - Record: 4a421ed9-ed0c-40bf-b06d-892871506124 */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "ideogram/character", recordId: "4a421ed9-ed0c-40bf-b06d-892871506124", modelName: "Ideogram Character", provider: "kie_ai", contentType: "image_editing", baseCreditCost: 6, estimatedTimeSeconds: 25, costMultipliers: { num_images: { "1": 1, "2": 2, "3": 3, "4": 4 }, rendering_speed: { BALANCED: 1.5, QUALITY: 2, TURBO: 1 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/ideogram.svg",
  modelFamily: "Ideogram",
  variantName: "Character",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Ideogram_Character.ts" } as const;

export const SCHEMA = { properties: { expand_prompt: { default: true, enum: [true, false], type: "boolean" }, image_size: { default: "square", enum: ["square", "square_hd", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"], type: "string" }, negative_prompt: { maxLength: 5000, type: "string" }, num_images: { default: "1", enum: ["1", "2", "3", "4"], type: "string" }, prompt: { type: "string" }, reference_image_urls: { items: { type: "string" }, title: "Upload your reference image", type: "array" }, rendering_speed: { default: "TURBO", enum: ["TURBO", "BALANCED", "QUALITY"], type: "string" }, seed: { type: "integer" }, style: { default: "AUTO", enum: ["AUTO", "REALISTIC", "FICTION"], type: "string" } }, required: ["prompt", "reference_image_urls"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt && inputs.reference_image_urls ? { valid: true } : { valid: false, error: "Missing required fields" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, reference_image_urls: inputs.reference_image_urls, style: inputs.style || "AUTO", rendering_speed: inputs.rendering_speed || "TURBO", image_size: inputs.image_size || "square", num_images: inputs.num_images || "1", expand_prompt: inputs.expand_prompt !== false } }; }
export function calculateCost(inputs: Record<string, any>) { const base = MODEL_CONFIG.baseCreditCost; const numMult = MODEL_CONFIG.costMultipliers.num_images[parseInt(inputs.num_images || "1")] || 1; const speedMult = MODEL_CONFIG.costMultipliers.rendering_speed[inputs.rendering_speed || "TURBO"] || 1; return base * numMult * speedMult; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) inputs.reference_image_urls = await uploadImagesToStorage(userId);
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: MODEL_CONFIG.contentType, prompt, tokens_used: cost, status: "pending", settings: modelParameters }).select().single();
  if (error || !gen) throw new Error(`Failed to create generation: ${error?.message}`);
  const payload = preparePayload(inputs);
  const apiKey = await getKieApiKey();
  const res = await fetch(`https://api.kie.ai${MODEL_CONFIG.apiEndpoint}`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`API call failed: ${res.statusText}`);
  const result = await res.json();
  await supabase.from("generations").update({ provider_task_id: result.taskId || result.id, provider_request: payload, provider_response: result }).eq("id", gen.id);
  startPolling(gen.id);
  return gen.id;
}

import { getKieApiKey as getCentralKieApiKey } from "../getKieApiKey";

async function getKieApiKey(): Promise<string> {
  return getCentralKieApiKey(MODEL_CONFIG.modelId, MODEL_CONFIG.recordId);
}
