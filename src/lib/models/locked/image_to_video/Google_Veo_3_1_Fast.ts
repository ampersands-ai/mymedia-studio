/** Google Veo 3.1 Fast (image_to_video) - Record: 8aac94cb-5625-47f4-880c-4f0fd8bd83a1 */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { deductCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "veo3_fast", recordId: "8aac94cb-5625-47f4-880c-4f0fd8bd83a1", modelName: "Google Veo 3.1 Fast", provider: "kie_ai", contentType: "video", baseCreditCost: 30, estimatedTimeSeconds: 300, costMultipliers: {}, apiEndpoint: "/api/v1/veo/generate", payloadStructure: "flat", maxImages: 2, defaultOutputs: 1 } as const;

export const SCHEMA = { properties: { aspectRatio: { default: "16:9", enum: ["16:9", "9:16", "1:1"], type: "string" }, endFrame: { description: "Last frame for the video generation (optional)", format: "uri", renderer: "image", title: "End Frame (Optional)", type: "string" }, generationType: { default: "FIRST_AND_LAST_FRAMES_2_VIDEO", showToUser: false, type: "string" }, model: { default: "veo3_fast", showToUser: false, type: "string" }, prompt: { description: "Describe the motion and style", maxLength: 1000, renderer: "prompt", type: "string" }, seeds: { maximum: 99999, minimum: 10000, type: "number" }, startFrame: { description: "First frame for the video generation", format: "uri", renderer: "image", title: "Start Frame", type: "string" } }, required: ["prompt", "startFrame", "model", "generationType"], type: "object", usePromptRenderer: true } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt && inputs.startFrame ? { valid: true } : { valid: false, error: "Prompt and start frame required" }; }
export function preparePayload(inputs: Record<string, any>) { return { prompt: inputs.prompt, startFrame: inputs.startFrame, endFrame: inputs.endFrame, aspectRatio: inputs.aspectRatio || "16:9", model: "veo3_fast", generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO", seeds: inputs.seeds }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) { const urls = await uploadImagesToStorage(userId); inputs.startFrame = urls[0]; if (urls[1]) inputs.endFrame = urls[1]; }
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await deductCredits(userId, cost);
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
