/** Grok Imagine (prompt_to_image) - Record: 49a79e90-830d-40ff-ad05-447cf0232592 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";

export const MODEL_CONFIG = {
  modelId: "grok-imagine/text-to-image",
  recordId: "49a79e90-830d-40ff-ad05-447cf0232592",
  modelName: "Grok Imagine",
  provider: "kie_ai",
  contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 2,
  estimatedTimeSeconds: 30,
  costMultipliers: {},
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 6,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/grok.png",
  modelFamily: "xAI",
  variantName: "Grok Imagine",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Grok_Imagine.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: { maxLength: 5000, renderer: "prompt", type: "string" },
    aspect_ratio: {
      default: "1:1",
      enum: ["2:3", "3:2", "1:1"],
      enumLabels: {
        "2:3": "Portrait (2:3)",
        "3:2": "Landscape (3:2)",
        "1:1": "Square (1:1)",
      },
      type: "string",
    },
  },
  required: ["prompt"],
  type: "object",
  "x-order": ["prompt", "aspect_ratio"],
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.aspect_ratio && !["2:3", "3:2", "1:1"].includes(inputs.aspect_ratio)) {
    return { valid: false, error: "aspect_ratio must be 2:3, 3:2, or 1:1" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    model: MODEL_CONFIG.modelId,
    input: {
      prompt: inputs.prompt,
      aspect_ratio: inputs.aspect_ratio || "1:1",
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
    const errorMessage = await extractEdgeFunctionError(funcError);
    throw new Error(errorMessage);
  }

  startPolling(gen.id);
  return gen.id;
}
