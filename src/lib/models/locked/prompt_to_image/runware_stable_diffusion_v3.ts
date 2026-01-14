/** runware stable diffusion v3 (prompt_to_image) - Record: c8f9b5e2-7d4a-6f3b-9e1c-5a8d3f7b4e9a */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { API_ENDPOINTS } from "@/lib/config/api-endpoints";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = { modelId: "runware:stable-diffusion-v3", recordId: "c8f9b5e2-7d4a-6f3b-9e1c-5a8d3f7b4e9a", modelName: "runware stable diffusion v3", provider: "runware", contentType: "prompt_to_image",
  use_api_key: "RUNWARE_API_KEY_PROMPT_TO_IMAGE", baseCreditCost: 0.15, estimatedTimeSeconds: 12, costMultipliers: {}, apiEndpoint: API_ENDPOINTS.RUNWARE.fullUrl, payloadStructure: "flat", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/plum.png",
  modelFamily: "Runware",
  variantName: "stable diffusion v3",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/runware_stable_diffusion_v3.ts" } as const;

// Dimension presets for aspect ratio mapping
const DIMENSION_PRESETS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1152, height: 640 },
  "9:16": { width: 640, height: 1152 },
  "4:3": { width: 1152, height: 896 },
  "3:4": { width: 896, height: 1152 },
};

// Normalize dimension to valid Runware range (multiple of 16, 128-2048)
function normalizeDimension(value: number): number {
  const clamped = Math.max(128, Math.min(2048, value));
  return Math.round(clamped / 16) * 16;
}

export const SCHEMA = {
  type: "object",
  required: ["positivePrompt"],
  properties: {
    positivePrompt: { type: "string", renderer: "prompt" },
    negativePrompt: { type: "string", description: "What to avoid in the image" },
    outputFormat: { type: "string", default: "PNG", enum: ["PNG", "JPEG", "WEBP"] },
    aspectRatio: { type: "string", default: "1:1", enum: ["1:1", "16:9", "9:16", "4:3", "3:4"] },
    width: { type: "integer", minimum: 128, maximum: 2048, description: "Image width (multiple of 16)" },
    height: { type: "integer", minimum: 128, maximum: 2048, description: "Image height (multiple of 16)" },
  },
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.positivePrompt || (typeof inputs.positivePrompt === "string" && inputs.positivePrompt.trim() === "")) {
    return { valid: false, error: "Prompt required" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  // Get dimensions: use explicit width/height if provided, otherwise derive from aspectRatio
  let width = 1024;
  let height = 1024;
  
  if (inputs.width !== undefined && inputs.height !== undefined) {
    width = normalizeDimension(Number(inputs.width));
    height = normalizeDimension(Number(inputs.height));
  } else if (inputs.aspectRatio && DIMENSION_PRESETS[inputs.aspectRatio]) {
    const preset = DIMENSION_PRESETS[inputs.aspectRatio];
    width = preset.width;
    height = preset.height;
  }

  const payload: Record<string, any> = {
    taskType: "imageInference",
    positivePrompt: inputs.positivePrompt,
    outputFormat: inputs.outputFormat || "PNG",
    numberResults: 1,
    width,
    height,
    steps: 20,
    outputType: ["URL"],
    includeCost: true,
  };

  // Only include negativePrompt if user provided a meaningful value
  if (inputs.negativePrompt && typeof inputs.negativePrompt === "string" && inputs.negativePrompt.trim().length >= 2) {
    payload.negativePrompt = inputs.negativePrompt.trim();
  }

  return payload;
}

export function calculateCost(_inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { ...modelParameters, positivePrompt: prompt };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: GENERATION_STATUS.PENDING, settings: sanitizeForStorage(modelParameters) }).select().single(); // (edge function will process)
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side
  // This keeps API keys secure and avoids CORS issues
  const { error: funcError } = await supabase.functions.invoke('generate-content', {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt: inputs.positivePrompt,
      custom_parameters: preparePayload(inputs)
    }
  });

  if (funcError) {
    await supabase.from('generations').update({ status: GENERATION_STATUS.FAILED }).eq('id', gen.id);
    const errorMessage = await extractEdgeFunctionError(funcError);
    throw new Error(errorMessage);
  }

  startPolling(gen.id);
  return gen.id;
}

