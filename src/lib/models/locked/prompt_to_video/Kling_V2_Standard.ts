/** Kling V2 Standard (prompt_to_video) - Record: a5e7c3a2-4d1f-0c6e-7a9f-2d4b5c6e3a7f */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "kling/v2-standard",
  recordId: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
  modelName: "Kling V2.1 Standard",
  provider: "kie_ai",
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
  baseCreditCost: 12.5,
  estimatedTimeSeconds: 180,
  costMultipliers: { duration: { "5": 1, "10": 2 } },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/kling.png",
  modelFamily: "Kling",
  variantName: "Kling V2.1 Standard",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Kling_V2_Standard.ts",
} as const;

export const SCHEMA = {
  properties: {
    aspect_ratio: { default: "16:9", enum: ["16:9", "9:16", "1:1"], type: "string" },
    duration: { default: "5", enum: ["5", "10"], type: "string" },
    prompt: { maxLength: 5000, renderer: "prompt", type: "string" },
  },
  required: ["prompt"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" };
}
export function preparePayload(inputs: Record<string, any>) {
  return {
    modelId: MODEL_CONFIG.modelId,
    input: { prompt: inputs.prompt, aspect_ratio: inputs.aspect_ratio || "16:9", duration: inputs.duration || "5" },
  };
}
export function calculateCost(inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost * (inputs.duration === "10" ? 2 : 1);
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  const validation = validate(inputs);
  if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: getGenerationType(MODEL_CONFIG.contentType),
      prompt,
      tokens_used: cost,
      status: GENERATION_STATUS.PENDING,
      settings: sanitizeForStorage(modelParameters),
    })
    .select()
    .single(); // (edge function will process)
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side
  // This keeps API keys secure and avoids CORS issues
  const { error: funcError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt,
      custom_parameters: preparePayload(inputs),
    },
  });

  if (funcError) {
    await supabase.from("generations").update({ status: GENERATION_STATUS.FAILED }).eq("id", gen.id);
    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  startPolling(gen.id);
  return gen.id;
}
