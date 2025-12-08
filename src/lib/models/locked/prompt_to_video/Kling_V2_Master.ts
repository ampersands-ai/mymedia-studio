/** Kling V2 Master (prompt_to_video) - Record: c5754cad-2b2c-4636-bc19-4ccaa97dde3d */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "kling/v2-1-master-text-to-video",
  recordId: "c5754cad-2b2c-4636-bc19-4ccaa97dde3d",
  modelName: "Kling V2.1 Master",
  provider: "kie_ai",
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
  baseCreditCost: 80,
  estimatedTimeSeconds: 300,
  costMultipliers: { duration: { "5": 1, "10": 2 } },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/kling.png",
  modelFamily: "Kling",
  variantName: "Kling V2.1 Master",
  displayOrderInFamily: 3,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Kling_V2_Master.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: {
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt describing the video you want to generate",
    },
    aspect_ratio: {
      default: "16:9",
      enum: ["16:9", "9:16", "1:1"],
      enumLabels: {
        "16:9": "Landscape (16:9)",
        "9:16": "Portrait (9:16)",
        "1:1": "Square (1:1)",
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
    negative_prompt: {
      maxLength: 500,
      type: "string",
      description: "Elements to avoid in the generated video",
    },
    cfg_scale: {
      type: "number",
      minimum: 0,
      maximum: 1,
      step: 0.1,
      default: 0.5,
      title: "CFG Scale",
      description: "How closely to follow the prompt (0-1)",
      showToUser: false,
    },
  },
  required: ["prompt"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length > 5000) return { valid: false, error: "Prompt must be 5000 characters or less" };
  if (inputs.negative_prompt && inputs.negative_prompt.length > 500) {
    return { valid: false, error: "Negative prompt must be 500 characters or less" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    aspect_ratio: inputs.aspect_ratio || "16:9",
    duration: inputs.duration || "5",
  };

  if (inputs.negative_prompt) payload.negative_prompt = inputs.negative_prompt;
  if (inputs.cfg_scale !== undefined) payload.cfg_scale = inputs.cfg_scale;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
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
