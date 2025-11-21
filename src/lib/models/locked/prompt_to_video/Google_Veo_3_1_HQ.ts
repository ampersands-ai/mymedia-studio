/** Google Veo 3.1 HQ (prompt_to_video) - Record: d117daae-f3ec-4b79-b98f-adefeee21454 */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "veo3", recordId: "d117daae-f3ec-4b79-b98f-adefeee21454", modelName: "Google Veo 3.1 HQ", provider: "kie_ai", contentType: "prompt_to_video", baseCreditCost: 125, estimatedTimeSeconds: 300, costMultipliers: {}, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/google.svg",
  modelFamily: "Google",
  variantName: "Veo 3.1 HQ",
  displayOrderInFamily: 3,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Google_Veo_3_1_HQ.ts" } as const;

export const SCHEMA = { properties: { aspect_ratio: { default: "16:9", enum: ["16:9", "9:16", "1:1"], type: "string" }, duration: { default: "5", enum: ["5", "10"], type: "string" }, prompt: { maxLength: 5000, renderer: "prompt", type: "string" } }, required: ["prompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, aspect_ratio: inputs.aspect_ratio || "16:9", duration: inputs.duration || "5" } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost * (inputs.duration === "10" ? 2 : 1); }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: "pending", settings: modelParameters }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);
  const { data: keyData } = await supabase.functions.invoke('get-api-key', {
    body: { provider: MODEL_CONFIG.provider, modelId: MODEL_CONFIG.modelId, recordId: MODEL_CONFIG.recordId }
  });
  if (!keyData?.apiKey) throw new Error('Failed to retrieve API key');
  const apiKey = keyData.apiKey;
  const res = await fetch(`https://api.kie.ai${MODEL_CONFIG.apiEndpoint}`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, body: JSON.stringify(preparePayload(inputs)) });
  if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
  const result = await res.json();
  await supabase.from("generations").update({ provider_task_id: result.taskId || result.id, provider_request: preparePayload(inputs), provider_response: result }).eq("id", gen.id);
  startPolling(gen.id);
  return gen.id;
}

