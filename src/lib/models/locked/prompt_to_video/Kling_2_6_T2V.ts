/** Kling 2.6 (prompt_to_video) - Record: d6e0f2a4-7b8c-9d0e-1f2a-3b4c5d6e7f8a */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Kling 2.6 - Latest version with sound generation support
 * Key differences from V2.x:
 * - Has `sound` parameter for audio generation
 * - Shorter prompt limit (1000 chars)
 * - No cfg_scale or negative_prompt
 * - All parameters are required
 */
export const MODEL_CONFIG = {
  modelId: "kling-2.6/text-to-video",
  recordId: "d6e0f2a4-7b8c-9d0e-1f2a-3b4c5d6e7f8a",
  modelName: "Kling V2.6",
  provider: "kie_ai",
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
  baseCreditCost: 20,
  estimatedTimeSeconds: 200,
  costMultipliers: { duration: { "5": 1, "10": 2 } },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/kling.png",
  modelFamily: "Kling",
  variantName: "Kling V2.6",
  displayOrderInFamily: 5,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Kling_2_6_T2V.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: {
      maxLength: 1000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt used to generate the video",
    },
    sound: {
      type: "boolean",
      default: false,
      title: "Generate Sound",
      description: "Whether the generated video contains sound",
    },
    aspect_ratio: {
      default: "16:9",
      enum: ["1:1", "16:9", "9:16"],
      enumLabels: {
        "1:1": "Square (1:1)",
        "16:9": "Landscape (16:9)",
        "9:16": "Portrait (9:16)",
      },
      type: "string",
    },
    duration: {
      default: "5",
      enum: ["5", "10"],
      enumLabels: {
        "5": "5 seconds",
        "10": "10 seconds",
      },
      type: "string",
    },
  },
  required: ["prompt", "sound", "aspect_ratio", "duration"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length > 1000) return { valid: false, error: "Prompt must be 1000 characters or less" };
  if (inputs.sound === undefined) return { valid: false, error: "Sound parameter required" };
  if (!inputs.aspect_ratio) return { valid: false, error: "Aspect ratio required" };
  if (!["1:1", "16:9", "9:16"].includes(inputs.aspect_ratio)) {
    return { valid: false, error: "Invalid aspect ratio" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    model: MODEL_CONFIG.modelId,
    input: {
      prompt: inputs.prompt,
      sound: inputs.sound ?? false,
      aspect_ratio: inputs.aspect_ratio || "16:9",
      duration: inputs.duration || "5",
    },
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const durKey = String(inputs.duration || "5") as keyof typeof MODEL_CONFIG.costMultipliers.duration;
  return MODEL_CONFIG.baseCreditCost * (MODEL_CONFIG.costMultipliers.duration[durKey] || 1);
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

  // Call edge function to handle API call server-side
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
