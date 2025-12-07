/** FLUX 2 Pro Text-to-Image (prompt_to_image) - Record: a1b2c3d4-e5f6-7890-abcd-ef1234567890 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = {
  modelId: "flux-2/pro-text-to-image",
  recordId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  modelName: "FLUX 2 Pro Text-to-Image",
  provider: "kie_ai",
  contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 2.5,
  estimatedTimeSeconds: 45,
  costMultipliers: {
    resolution: { "1K": 1, "2K": 1.4 },
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/flux.png",
  modelFamily: "FLUX",
  variantName: "Flux 2 Pro",
  displayOrderInFamily: 6,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/FLUX_2_Pro_Text_to_Image.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: {
      minLength: 3,
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      description: "A text description of the image you want to generate (3-5000 characters)",
    },
    aspect_ratio: {
      default: "1:1",
      enum: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "auto"],
      enumLabels: {
        "1:1": "1:1 (Square)",
        "4:3": "4:3 (Landscape)",
        "3:4": "3:4 (Portrait)",
        "16:9": "16:9 (Widescreen)",
        "9:16": "9:16 (Vertical)",
        "3:2": "3:2 (Classic)",
        "2:3": "2:3 (Classic Portrait)",
        auto: "Auto (Based on first input image)",
      },
      type: "string",
    },
    resolution: {
      default: "1K",
      enum: ["1K", "2K"],
      type: "string",
      description: "Output image resolution",
    },
  },
  required: ["prompt", "aspect_ratio", "resolution"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length < 3) return { valid: false, error: "Prompt must be at least 3 characters" };
  if (inputs.prompt.length > 5000) return { valid: false, error: "Prompt must be 5000 characters or less" };
  if (!inputs.aspect_ratio) return { valid: false, error: "Aspect ratio required" };
  if (!["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "auto"].includes(inputs.aspect_ratio)) {
    return { valid: false, error: "Invalid aspect_ratio value" };
  }
  if (!inputs.resolution) return { valid: false, error: "Resolution required" };
  if (!["1K", "2K"].includes(inputs.resolution)) {
    return { valid: false, error: "Resolution must be 1K or 2K" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    model: MODEL_CONFIG.modelId,
    input: {
      prompt: inputs.prompt,
      aspect_ratio: inputs.aspect_ratio || "1:1",
      resolution: inputs.resolution || "1K",
    },
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const base = MODEL_CONFIG.baseCreditCost;
  const resKey = (inputs.resolution || "1K") as keyof typeof MODEL_CONFIG.costMultipliers.resolution;
  const resMult = MODEL_CONFIG.costMultipliers.resolution[resKey] || 1;
  return Math.round(base * resMult * 100) / 100;
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
