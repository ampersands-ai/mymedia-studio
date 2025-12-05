/** Nano Banana (Lovable AI) (prompt_to_image) - Record: 4c680009-d3fe-436f-85a7-467c76e85f9e */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = { modelId: "gpt-image-1", recordId: "4c680009-d3fe-436f-85a7-467c76e85f9e", modelName: "GPT-5 Image (Lovable AI)", provider: "lovable_ai_sync", contentType: "prompt_to_image", baseCreditCost: 1, estimatedTimeSeconds: 15, costMultipliers: {}, apiEndpoint: null, payloadStructure: "direct", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/openai.png",
  modelFamily: "OpenAI",
  variantName: "GPT-5 Image",
  displayOrderInFamily: 1,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Nano_Banana_Lovable_AI.ts" } as const;

export const SCHEMA = { properties: { aspect_ratio: { default: "1:1", enum: ["1:1", "3:4", "4:3", "9:16", "16:9"], type: "string" }, number_of_images: { default: 1, maximum: 4, minimum: 1, type: "integer" }, prompt: { maxLength: 5000, renderer: "prompt", type: "string" }, seed: { type: "integer" } }, required: ["prompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { prompt: inputs.prompt, aspect_ratio: inputs.aspect_ratio || "1:1", number_of_images: inputs.number_of_images || 1, ...(inputs.seed && { seed: inputs.seed }) }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost * (inputs.number_of_images || 1); }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: GENERATION_STATUS.PENDING, settings: sanitizeForStorage(modelParameters) }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);
  
  // Lovable AI Sync - direct generation via edge function
  const { error: funcError } = await supabase.functions.invoke('generate-content-sync', {
    body: {
      generationId: gen.id,
      model: MODEL_CONFIG.modelId,
      prompt: inputs.prompt,
      parameters: preparePayload(inputs)
    }
  });
  
  if (funcError) throw new Error(`Sync generation failed: ${funcError.message}`);
  
  startPolling(gen.id);
  return gen.id;
}
