/** Hailuo 02 Standard Text-to-Video (prompt_to_video) - Record: e8a3b4c5-0d1e-2f3a-4b5c-6d7e8f9a0b1c */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Hailuo 02 Standard Text-to-Video
 * - 768p output
 * - 2.5 credits/second
 * - Duration: 6s (15 credits) or 10s (25 credits)
 * - prompt_optimizer available
 */
export const MODEL_CONFIG = {
  modelId: "hailuo/02-text-to-video-standard",
  recordId: "e8a3b4c5-0d1e-2f3a-4b5c-6d7e8f9a0b1c",
  modelName: "Hailuo 02 Standard",
  provider: "kie_ai",
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
  baseCreditCost: 15, // 2.5 credits/sec × 6 seconds (default)
  estimatedTimeSeconds: 120,
  costMultipliers: {
    duration: { "6": 1, "10": 1.6667 }, // 15 → 25 credits
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/hailuo.png",
  modelFamily: "Hailuo",
  variantName: "Hailuo 2 Standard",
  displayOrderInFamily: 3,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Hailuo_02_Standard_T2V.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: {
      maxLength: 1500,
      renderer: "prompt",
      type: "string",
      description: "Text description for video generation",
    },
    duration: {
      default: "6",
      enum: ["6", "10"],
      enumLabels: {
        "6": "6 seconds",
        "10": "10 seconds",
      },
      type: "string",
      title: "Duration",
    },
    prompt_optimizer: {
      type: "boolean",
      default: true,
      title: "Prompt Optimizer",
      showToUser: false,
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

  if (inputs.duration) payload.duration = inputs.duration;
  if (inputs.prompt_optimizer !== undefined) payload.prompt_optimizer = inputs.prompt_optimizer;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, unknown>) {
  // Direct pricing: 6s = 15 credits, 10s = 25 credits
  const duration = (inputs.duration as string) || "6";
  if (duration === "10") return 25;
  return 15;
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
    const errorMessage = await extractEdgeFunctionError(funcError);
    throw new Error(errorMessage);
  }

  startPolling(gen.id);
  return gen.id;
}
