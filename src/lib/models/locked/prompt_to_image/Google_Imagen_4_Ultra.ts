/** Google Imagen 4 Ultra (prompt_to_image) - Record: 23e81043-5e53-400b-bc1a-2a1ed9f30ce0 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";

export const MODEL_CONFIG = {
  modelId: "google/imagen4-ultra",
  recordId: "23e81043-5e53-400b-bc1a-2a1ed9f30ce0",
  modelName: "Google Imagen 4 Ultra",
  provider: "kie_ai",
  contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 6,
  estimatedTimeSeconds: 25,
  costMultipliers: {},
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/google.png",
  modelFamily: "Google",
  variantName: "Imagen 4 Ultra",
  displayOrderInFamily: 3,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Google_Imagen_4_Ultra.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: { maxLength: 5000, renderer: "prompt", type: "string" },
    aspect_ratio: {
      default: "1:1",
      enum: ["1:1", "16:9", "9:16", "3:4", "4:3"],
      type: "string",
    },
    negative_prompt: { maxLength: 5000, type: "string" },
    seed: { maxLength: 500, type: "string", showToUser: false },
  },
  required: ["prompt"],
  type: "object",
  "x-order": ["prompt", "aspect_ratio", "negative_prompt", "seed"],
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length > 5000) return { valid: false, error: "Prompt must be 5000 characters or less" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    model: MODEL_CONFIG.modelId,
    input: {
      prompt: inputs.prompt,
      aspect_ratio: inputs.aspect_ratio || "1:1",
      ...(inputs.seed && { seed: inputs.seed }),
      ...(inputs.negative_prompt && { negative_prompt: inputs.negative_prompt }),
    },
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
    const errorMessage = await extractEdgeFunctionError(funcError);
    throw new Error(errorMessage);
  }

  startPolling(gen.id);
  return gen.id;
}
