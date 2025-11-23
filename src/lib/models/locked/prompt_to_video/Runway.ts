/** Runway (prompt_to_video) - Record: 9efdc56b-6a76-4c82-94cf-16285d8c3e7d */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "runway-duration-5-generate model", recordId: "9efdc56b-6a76-4c82-94cf-16285d8c3e7d", modelName: "Runway", provider: "kie_ai", contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO", baseCreditCost: 3, estimatedTimeSeconds: 300, costMultipliers: { "duration": { "10": 2.5 }, "quality": { "1080p": 2.5 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/runway.png",
  modelFamily: "Runway",
  variantName: "Runway",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Runway.ts" } as const;

export const SCHEMA = { properties: { duration: { default: "5", enum: ["5", "10"], type: "string" }, prompt: { maxLength: 5000, renderer: "prompt", type: "string" } }, required: ["prompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, duration: inputs.duration || "5" } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost * (inputs.duration === "10" ? 2 : 1); }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: "pending", settings: modelParameters }).select().single(); // (edge function will process)
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side
  // This keeps API keys secure and avoids CORS issues
  const { error: funcError } = await supabase.functions.invoke('generate-content', {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt,
      custom_parameters: preparePayload(inputs)
    }
  });

  if (funcError) {
    await supabase.from('generations').update({ status: 'failed' }).eq('id', gen.id);
    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  startPolling(gen.id);
  return gen.id;
}

