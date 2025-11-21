/** FLUX.1 Kontext Pro prompt_to_image - Record: 94b43382-bf4b-490d-82b5-265d14473f9b */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "flux-kontext-pro", recordId: "94b43382-bf4b-490d-82b5-265d14473f9b", modelName: "FLUX.1 Kontext Pro", provider: "kie_ai", contentType: "prompt_to_image", baseCreditCost: 2.5, estimatedTimeSeconds: 50, costMultipliers: {}, apiEndpoint: "/api/v1/flux/kontext/generate", payloadStructure: "flat", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/src/assets/partners/blackforest.svg",
  modelFamily: "FLUX",
  variantName: "1 Kontext Pro",
  displayOrderInFamily: 3,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/FLUX_1_Kontext_Pro_prompt.ts" } as const;

export const SCHEMA = { imageInputField: "inputImage", properties: { aspectRatio: { default: "16:9", enum: ["1:1", "3:4", "4:3", "9:16", "16:9", "21:9"], type: "string" }, enableTranslation: { default: true, enum: [true, false], showToUser: false, type: "boolean" }, inputImage: { renderer: "image", title: "Upload Image", type: "string" }, outputFormat: { default: "jpeg", enum: ["jpeg", "png"], type: "string" }, prompt: { renderer: "prompt", title: "Prompt", type: "string" } }, required: ["prompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { prompt: inputs.prompt, inputImage: inputs.inputImage, aspectRatio: inputs.aspectRatio || "16:9", outputFormat: inputs.outputFormat || "jpeg", enableTranslation: true }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) inputs.inputImage = (await uploadImagesToStorage(userId))[0];
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
