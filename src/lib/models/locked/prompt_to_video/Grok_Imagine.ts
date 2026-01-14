/** Grok Imagine Text-to-Video (prompt_to_video) - Record: 0643a43b-4995-4c5b-ac1d-76ea257a93a0 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Grok Imagine Text-to-Video
 * - Pure text-to-video generation (no image input)
 * - Supports fun, normal, and spicy modes (all modes available for T2V)
 * - Aspect ratios: 2:3, 3:2, 1:1
 */
export const MODEL_CONFIG = {
  modelId: "grok-imagine/text-to-video",
  recordId: "0643a43b-4995-4c5b-ac1d-76ea257a93a0",
  modelName: "Grok Imagine",
  provider: "kie_ai",
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
  baseCreditCost: 10,
  estimatedTimeSeconds: 300,
  costMultipliers: {},
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/grok.png",
  modelFamily: "xAI",
  variantName: "Grok Imagine",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Grok_Imagine_T2V.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: {
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt describing the desired video",
    },
    aspect_ratio: {
      default: "2:3",
      enum: ["2:3", "3:2", "1:1"],
      enumLabels: {
        "2:3": "Portrait (2:3)",
        "3:2": "Landscape (3:2)",
        "1:1": "Square (1:1)",
      },
      type: "string",
      title: "Aspect Ratio",
    },
    mode: {
      default: "normal",
      enum: ["fun", "normal", "spicy"],
      enumLabels: {
        fun: "Fun",
        normal: "Normal",
        spicy: "Spicy",
      },
      type: "string",
      title: "Mode",
    },
  },
  required: ["prompt"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length > 5000) return { valid: false, error: "Prompt must be 5000 characters or less" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
  };

  if (inputs.aspect_ratio) payload.aspect_ratio = inputs.aspect_ratio;
  if (inputs.mode) payload.mode = inputs.mode;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(_inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
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
