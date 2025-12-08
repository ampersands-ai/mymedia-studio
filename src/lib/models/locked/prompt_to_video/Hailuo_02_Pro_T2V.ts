/** Hailuo 02 Pro Text-to-Video (prompt_to_video) - Record: d7f2a3b4-9c0d-1e2f-3a4b-5c6d7e8f9a0b */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Hailuo 02 Pro Text-to-Video
 * - Fixed 1080p 6-second output
 * - 5 credits/second = 30 credits per generation
 * - prompt_optimizer available
 */
export const MODEL_CONFIG = {
  modelId: "hailuo/02-text-to-video-pro",
  recordId: "d7f2a3b4-9c0d-1e2f-3a4b-5c6d7e8f9a0b",
  modelName: "Hailuo 02 Pro",
  provider: "kie_ai",
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
  baseCreditCost: 30, // 5 credits/sec × 6 seconds
  estimatedTimeSeconds: 180,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  costMultipliers: null,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/minimax.png",
  modelFamily: "Hailuo",
  variantName: "Hailuo 2 Pro",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Hailuo_02_Pro_T2V.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: {
      maxLength: 1500,
      renderer: "prompt",
      type: "string",
      description: "Text prompt for video generation",
    },
    prompt_optimizer: {
      type: "boolean",
      default: true,
      title: "Prompt Optimizer",
      description: "Use the model's prompt optimizer for better results",
    },
  },
  required: ["prompt"],
  type: "object",
} as const;

export function validate(inputs: Record<string, unknown>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (typeof inputs.prompt === "string" && inputs.prompt.length > 1500)
    return { valid: false, error: "Prompt must be 1500 characters or less" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    prompt: inputs.prompt,
  };

  if (inputs.prompt_optimizer !== undefined) payload.prompt_optimizer = inputs.prompt_optimizer;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(_inputs: Record<string, unknown>) {
  return MODEL_CONFIG.baseCreditCost;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, unknown> = { prompt, ...modelParameters };
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
    .single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

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
