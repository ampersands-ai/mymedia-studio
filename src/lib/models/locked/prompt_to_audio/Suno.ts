/** Suno (prompt_to_audio) - Record: a7c9e4f6-8d2b-5f3c-9a6e-7d4b8c5f3a9e */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";

export const MODEL_CONFIG = { modelId: "V5", recordId: "5c544c90-9344-4acb-9129-0acb9a6a915a", modelName: "Suno", provider: "kie_ai", contentType: "prompt_to_audio", baseCreditCost: 6, estimatedTimeSeconds: 180, costMultipliers: {}, apiEndpoint: "/api/v1/generate", payloadStructure: "flat", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/public/logos/suno.png",
  modelFamily: "Suno",
  variantName: "Suno",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_audio/Suno.ts" } as const;

export const SCHEMA = { properties: { audioWeight: { default: 0.5, description: "Balance weight for audio features vs. other factors. Optional. Range 0–1, up to 2 decimal places.", maximum: 1, minimum: 0.1, type: "number" }, customMode: { default: false, enum: [true, false], type: "boolean" }, instrumental: { default: false, description: "Determines if the audio should be instrumental (no lyrics).", enum: [true, false], type: "boolean" }, model: { default: "V5", description: "V5: Superior musical expression, faster generation. V4_5PLUS: V4.5+ is richer sound, new ways to create, max 8 min. V4_5: V4.5 is smarter prompts, faster generations, max 8 min. V4: V4 is improved vocal quality, max 4 min. V3_5: V3.5 is better song structure, max 4 min.", enum: ["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"], type: "string" }, negativeTags: { description: "Music styles or traits to exclude from the generated audio. Use to avoid specific styles.", maxLength: 500, type: "string" }, prompt: { description: "Style or genre for music generation (e.g., 'cinematic orchestral' or 'upbeat electronic').", maxLength: 500, type: "string" }, tags: { description: "Short description of style or genre for the music (e.g., 'cinematic orchestral', 'upbeat electronic').", maxLength: 120, type: "string" }, title: { description: "Optional song title (up to 80 characters).", maxLength: 80, type: "string" } }, required: ["prompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { prompt: inputs.prompt, tags: inputs.tags, title: inputs.title, model: inputs.model || "V5", customMode: inputs.customMode || false, instrumental: inputs.instrumental || false, audioWeight: inputs.audioWeight || 0.5, negativeTags: inputs.negativeTags }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: calculateCost(inputs), status: "pending", settings: modelParameters }).select().single();
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
