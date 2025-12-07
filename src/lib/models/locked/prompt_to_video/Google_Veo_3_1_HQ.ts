/** Google Veo 3.1 HQ (prompt_to_video) - Record: d117daae-f3ec-4b79-b98f-adefeee21454 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "veo3",
  recordId: "d117daae-f3ec-4b79-b98f-adefeee21454",
  modelName: "Google Veo 3.1 HQ",
  provider: "kie_ai",
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
  baseCreditCost: 125,
  estimatedTimeSeconds: 300,
  costMultipliers: {},
  apiEndpoint: "/api/v1/veo/generate",
  payloadStructure: "flat",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/google.png",
  modelFamily: "Google",
  variantName: "Veo 3.1 HQ",
  displayOrderInFamily: 3,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Google_Veo_3_1_HQ.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: {
      renderer: "prompt",
      type: "string",
      description: "Describe the video content, actions, scenes, and style",
    },
    aspectRatio: {
      default: "16:9",
      enum: ["16:9", "9:16"],
      enumLabels: {
        "16:9": "Landscape (16:9) - HD 1080p",
        "9:16": "Portrait (9:16) - Mobile",
      },
      type: "string",
    },
    seeds: {
      type: "integer",
      minimum: 10000,
      maximum: 99999,
      description: "Random seed for reproducible generation",
      showToUser: false,
    },
    enableTranslation: {
      type: "boolean",
      default: true,
      description: "Automatically translate prompts to English",
      showToUser: false,
    },
    watermark: {
      type: "string",
      description: "Watermark text to add to video",
      showToUser: false,
    },
  },
  required: ["prompt"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    model: MODEL_CONFIG.modelId,
    generationType: "TEXT_2_VIDEO",
    aspectRatio: inputs.aspectRatio || "16:9",
    enableTranslation: inputs.enableTranslation !== false,
  };

  if (inputs.seeds !== undefined && inputs.seeds >= 10000 && inputs.seeds <= 99999) {
    payload.seeds = inputs.seeds;
  }
  if (inputs.watermark) payload.watermark = inputs.watermark;

  return payload;
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
