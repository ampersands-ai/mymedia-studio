/** FLUX.1 Pro prompt_to_image - Record: 7a2f8c3e-4b5d-6e9a-1f8c-2d4b6e9a3f5c */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";

export const MODEL_CONFIG = {
  modelId: "runware:100@1",
  recordId: "7a2f8c3e-4b5d-6e9a-1f8c-2d4b6e9a3f5c",
  modelName: "FLUX.1 Pro",
  provider: "runware",
  contentType: "prompt_to_image",
  use_api_key: "RUNWARE_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 0.2,
  estimatedTimeSeconds: 15,
  costMultipliers: {},
  apiEndpoint: "https://api.runware.ai/v1",
  payloadStructure: "flat",
  maxImages: 0,
  defaultOutputs: 1,

  // UI metadata
  isActive: true,
  logoUrl: "/logos/flux.png",
  modelFamily: "FLUX",
  variantName: "1 Pro",
  displayOrderInFamily: 3,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/FLUX_1_Pro.ts"
} as const;

export const SCHEMA = {
  properties: {
    positivePrompt: {
      maxLength: 5000,
      renderer: "prompt",
      title: "Prompt",
      type: "string"
    },
    numberResults: {
      default: 1,
      showToUser: false,
      type: "integer"
    },
    outputFormat: {
      default: "PNG",
      enum: ["WEBP", "JPEG", "PNG"],
      type: "string"
    }
  },
  required: ["positivePrompt", "numberResults", "outputFormat"],
  type: "object"
} as const;

export function validate(inputs: Record<string, any>) {
  return inputs.positivePrompt ? { valid: true } : { valid: false, error: "Prompt required" };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    taskType: "imageInference",
    positivePrompt: inputs.positivePrompt,
    numberResults: inputs.numberResults || 1,
    outputFormat: inputs.outputFormat || "PNG",
    width: 896,
    height: 1152,
    steps: 4,
    CFGScale: 1,
    scheduler: "FlowMatchEulerDiscreteScheduler",
    includeCost: true,
    checkNSFW: true,
    outputType: ["URL"]
  };
}

export function calculateCost(inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { positivePrompt: prompt, ...modelParameters };
  
  const validation = validate(inputs);
  if (!validation.valid) throw new Error(validation.error);
  
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  
  const { data: gen, error } = await supabase.from("generations").insert({
    user_id: userId,
    model_id: MODEL_CONFIG.modelId,
    model_record_id: MODEL_CONFIG.recordId,
    type: getGenerationType(MODEL_CONFIG.contentType),
    prompt,
    tokens_used: cost,
    status: GENERATION_STATUS.PENDING, // (edge function will process)
    settings: modelParameters
  }).select().single();

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
    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  startPolling(gen.id);
  return gen.id;
}
