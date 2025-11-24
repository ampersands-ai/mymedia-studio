/** Nano Banana by Google (prompt_to_image) - Record: 09b03fa3-e648-4d42-8494-b91bd2e609b8 */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";

export const MODEL_CONFIG = { modelId: "google/nano-banana", recordId: "09b03fa3-e648-4d42-8494-b91bd2e609b8", modelName: "Nano Banana by Google", provider: "kie_ai", contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE", baseCreditCost: 2, estimatedTimeSeconds: 15, costMultipliers: {}, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/google.png",
  modelFamily: "Google",
  variantName: "Nano Banana",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Nano_Banana_by_Google.ts" } as const;

export const SCHEMA = { properties: { aspect_ratio: { default: "1:1", enum: ["1:1", "3:4", "4:3", "9:16", "16:9"], type: "string" }, number_of_images: { default: 1, maximum: 4, minimum: 1, type: "integer" }, prompt: { maxLength: 5000, renderer: "prompt", type: "string" }, seed: { type: "integer" } }, required: ["prompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, aspect_ratio: inputs.aspect_ratio || "1:1", number_of_images: inputs.number_of_images || 1, ...(inputs.seed && { seed: inputs.seed }) } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost * (inputs.number_of_images || 1); }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);

  // Create generation record with pending status (edge function will process)
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: GENERATION_STATUS.PENDING, settings: modelParameters }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side
  // This keeps API keys secure and avoids CORS issues
  const { error: funcError } = await supabase.functions.invoke('generate-content', {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt,
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

