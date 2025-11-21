/** Google Veo 3.1 Reference (image_to_video) - Record: 6e8a863e-8630-4eef-bdbb-5b41f4c883f9 */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "veo3_fast", recordId: "6e8a863e-8630-4eef-bdbb-5b41f4c883f9", modelName: "Google Veo 3.1 Reference", provider: "kie_ai", contentType: "image_to_video", baseCreditCost: 30, estimatedTimeSeconds: 300, costMultipliers: {}, apiEndpoint: "/api/v1/veo/generate", payloadStructure: "flat", maxImages: 3, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/public/logos/google.png",
  modelFamily: "Google",
  variantName: "Veo 3.1 Reference",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Google_Veo_3_1_Reference.ts" } as const;

export const SCHEMA = { imageInputField: "", properties: { aspectRatio: { default: "16:9", enum: ["Auto", "16:9", "9:16"], title: " Aspect Ratio", type: "string" }, generationType: { default: "REFERENCE_2_VIDEO", showToUser: false, type: "string" }, imageUrls: { description: "Max of 3", renderer: "image", title: "Upload Images", type: "string" }, prompt: { maxLength: 5000, renderer: "prompt", type: "string" }, seeds: { maximum: 99999, minimum: 10000, type: "integer" } }, required: ["prompt", "imageUrls", "generationType"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt && inputs.imageUrls ? { valid: true } : { valid: false, error: "Prompt and images required" }; }
export function preparePayload(inputs: Record<string, any>) { return { prompt: inputs.prompt, imageUrls: inputs.imageUrls, aspectRatio: inputs.aspectRatio || "16:9", generationType: "REFERENCE_2_VIDEO", seeds: inputs.seeds }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) inputs.imageUrls = (await uploadImagesToStorage(userId)).join(",");
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: "pending", settings: modelParameters }).select().single();
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
