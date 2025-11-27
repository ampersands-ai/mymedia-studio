/** HiDream Fast (prompt_to_image) - Record: 7fe80ee8-701c-49b9-a21e-79f8c82489c8 */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { API_ENDPOINTS } from "@/lib/config/api-endpoints";

export const MODEL_CONFIG = { modelId: "runware:97@1", recordId: "7fe80ee8-701c-49b9-a21e-79f8c82489c8", modelName: "HiDream Fast", provider: "runware", contentType: "prompt_to_image",
  use_api_key: "RUNWARE_API_KEY_PROMPT_TO_IMAGE", baseCreditCost: 0.3, estimatedTimeSeconds: 10, costMultipliers: {}, apiEndpoint: API_ENDPOINTS.RUNWARE.fullUrl, payloadStructure: "direct", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/hidream.png",
  modelFamily: "HiDream",
  variantName: "Fast",
  displayOrderInFamily: 1,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/HiDream_Fast.ts" } as const;

export const SCHEMA = { properties: { CFGScale: { default: 1, showToUser: false, type: "number" }, checkNSFW: { default: true, showToUser: false, type: "boolean" }, height: { default: 1152, showToUser: false, type: "number" }, includeCost: { default: true, showToUser: false, type: "boolean" }, numberResults: { default: 1, showToUser: false, title: "number of images", type: "number" }, outputFormat: { default: "WEBP", enum: ["PNG", "JPG", "WEBP"], showToUser: false, type: "string" }, outputType: { default: "URL", showToUser: false, type: "string" }, positivePrompt: { renderer: "prompt", type: "string" }, taskType: { default: "imageInference", showToUser: false, type: "string" }, taskUUID: { showToUser: false, type: "string" }, uploadEndpoint: { showToUser: false, type: "string" }, width: { default: 896, showToUser: false, type: "number" } }, required: ["positivePrompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.positivePrompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return [{ taskType: "imageInference", taskUUID: inputs.taskUUID || crypto.randomUUID(), model: MODEL_CONFIG.modelId, positivePrompt: inputs.positivePrompt, height: inputs.height || 1152, width: inputs.width || 896, numberResults: inputs.numberResults || 1, outputType: inputs.outputType || "URL", outputFormat: inputs.outputFormat || "WEBP", includeCost: true, checkNSFW: true, CFGScale: inputs.CFGScale || 1, ...(inputs.uploadEndpoint && { uploadEndpoint: inputs.uploadEndpoint }) }]; }
export function calculateCost(_inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { positivePrompt: prompt, ...modelParameters };
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: GENERATION_STATUS.PENDING, settings: modelParameters }).select().single(); // (edge function will process)
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
