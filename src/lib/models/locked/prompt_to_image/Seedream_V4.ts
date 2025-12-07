/** Seedream V4 (prompt_to_image) - Record: c0e4f338-683a-4b5d-8289-518f2b5ea983 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "bytedance/seedream-v4-text-to-image",
  recordId: "c0e4f338-683a-4b5d-8289-518f2b5ea983",
  modelName: "Seedream V4",
  provider: "kie_ai",
  contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 2.5,
  estimatedTimeSeconds: 30,
  costMultipliers: {
    max_images: { 1: 1, 2: 2, 3: 3, 4: 4 },
    image_resolution: { "1K": 1, "2K": 1, "4K": 1 },
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/seedream.png",
  modelFamily: "Seedream",
  variantName: "Seedream V4",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Seedream_V4.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: { maxLength: 5000, renderer: "prompt", type: "string" },
    image_size: {
      default: "square_hd",
      enum: [
        "square",
        "square_hd",
        "portrait_4_3",
        "portrait_3_2",
        "portrait_16_9",
        "landscape_4_3",
        "landscape_3_2",
        "landscape_16_9",
        "landscape_21_9",
      ],
      enumLabels: {
        square: "Square",
        square_hd: "Square HD",
        portrait_4_3: "Portrait 3:4",
        portrait_3_2: "Portrait 2:3",
        portrait_16_9: "Portrait 9:16",
        landscape_4_3: "Landscape 4:3",
        landscape_3_2: "Landscape 3:2",
        landscape_16_9: "Landscape 16:9",
        landscape_21_9: "Landscape 21:9",
      },
      type: "string",
    },
    image_resolution: {
      default: "4K",
      enum: ["1K", "2K", "4K"],
      type: "string",
    },
    max_images: {
      default: 1,
      minimum: 1,
      maximum: 4,
      step: 1,
      type: "integer",
    },
    seed: { type: "integer" },
  },
  required: ["prompt"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.max_images !== undefined && (inputs.max_images < 1 || inputs.max_images > 6)) {
    return { valid: false, error: "max_images must be between 1 and 6" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    model: MODEL_CONFIG.modelId,
    input: {
      prompt: inputs.prompt,
      image_size: inputs.image_size || "square_hd",
      image_resolution: inputs.image_resolution || "1K",
      max_images: inputs.max_images || 1,
      ...(inputs.seed !== undefined && inputs.seed !== null && { seed: inputs.seed }),
    },
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const base = MODEL_CONFIG.baseCreditCost;
  const resKey = (inputs.image_resolution || "1K") as keyof typeof MODEL_CONFIG.costMultipliers.image_resolution;
  const resMult = MODEL_CONFIG.costMultipliers.image_resolution[resKey] || 1;
  const numImages = Math.min(Math.max(inputs.max_images || 1, 1), 6);
  return Math.round(base * resMult * numImages * 100) / 100;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  const validation = validate(inputs);
  if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);

  // Create generation record with pending status (edge function will process)
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
