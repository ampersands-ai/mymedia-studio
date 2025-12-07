/** Seedream V4.5 (prompt_to_image) - Record: b4c5d6e7-8f9a-0b1c-2d3e-4f5a6b7c8d9e */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "seedream/4.5-text-to-image",
  recordId: "d5e6f7a8-9b0c-1d2e-3f4a-5b6c7d8e9f0a",
  modelName: "Seedream V4.5",
  provider: "kie_ai",
  contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 3.5,
  estimatedTimeSeconds: 35,
  costMultipliers: { quality: { basic: 1, high: 1 } },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/seedream.png",
  modelFamily: "Seedream",
  variantName: "Seedream V4.5",
  displayOrderInFamily: 3,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Seedream_V4_5.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: { maxLength: 3000, renderer: "prompt", type: "string" },
    aspect_ratio: {
      default: "1:1",
      enum: ["1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "21:9"],
      enumLabels: {
        "1:1": "Square (1:1)",
        "4:3": "Landscape 4:3",
        "3:4": "Portrait 3:4",
        "16:9": "Landscape 16:9",
        "9:16": "Portrait 9:16",
        "2:3": "Portrait 2:3",
        "3:2": "Landscape 3:2",
        "21:9": "Ultra Wide 21:9",
      },
      type: "string",
    },
    quality: {
      default: "high",
      enum: ["basic", "high"],
      enumLabels: {
        basic: "Basic (2K)",
        high: "High (4K)",
      },
      type: "string",
    },
  },
  required: ["prompt", "aspect_ratio", "quality"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (!inputs.aspect_ratio) return { valid: false, error: "Aspect ratio required" };
  if (!inputs.quality) return { valid: false, error: "Quality required" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    model: MODEL_CONFIG.modelId,
    input: {
      prompt: inputs.prompt,
      aspect_ratio: inputs.aspect_ratio || "1:1",
      quality: inputs.quality || "basic",
    },
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const baseCost = MODEL_CONFIG.baseCreditCost;
  const qualityMultiplier =
    MODEL_CONFIG.costMultipliers.quality[inputs.quality as keyof typeof MODEL_CONFIG.costMultipliers.quality] || 1;
  return baseCost * qualityMultiplier;
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
