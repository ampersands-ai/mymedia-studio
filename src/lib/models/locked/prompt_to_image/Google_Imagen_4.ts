/** Google Imagen 4 (prompt_to_image) - Record: 5290ad50-ebeb-4fc0-97fb-bff7db6784b5 */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = { modelId: "google/imagen4", recordId: "5290ad50-ebeb-4fc0-97fb-bff7db6784b5", modelName: "Google Imagen 4", provider: "kie_ai", contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE", baseCreditCost: 4, estimatedTimeSeconds: 25, costMultipliers: { num_images: { "1": 1, "2": 2, "3": 3, "4": 4 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/google.png",
  modelFamily: "Google",
  variantName: "Imagen 4",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Google_Imagen_4.ts" } as const;

export const SCHEMA = { properties: { aspect_ratio: { default: "1:1", enum: ["1:1", "3:4", "4:3", "9:16", "16:9"], type: "string" }, negative_prompt: { type: "string" }, num_images: { default: 1, enum: [1, 2, 3, 4], title: "Number of Outputs", type: "string" }, prompt: { renderer: "prompt", type: "string" }, seed: { type: "string" } }, required: ["prompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, aspect_ratio: inputs.aspect_ratio || "1:1", num_images: inputs.num_images || 1, ...(inputs.seed && { seed: inputs.seed }), ...(inputs.negative_prompt && { negative_prompt: inputs.negative_prompt }) } }; }
export function calculateCost(inputs: Record<string, any>) { const numImages = String(inputs.num_images || "1") as keyof typeof MODEL_CONFIG.costMultipliers.num_images; return MODEL_CONFIG.baseCreditCost * (MODEL_CONFIG.costMultipliers.num_images[numImages] || 1); }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);

  // Create generation record with pending status (edge function will process)
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: GENERATION_STATUS.PENDING, settings: sanitizeForStorage(modelParameters) }).select().single();
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
