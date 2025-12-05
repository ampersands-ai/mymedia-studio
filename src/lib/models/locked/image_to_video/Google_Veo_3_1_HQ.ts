/** Google Veo 3.1 HQ (image_to_video) - Record: a5c2ec16-6294-4588-86b6-7b4182601cda */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

export const MODEL_CONFIG = { modelId: "veo3", recordId: "a5c2ec16-6294-4588-86b6-7b4182601cda", modelName: "Google Veo 3.1 HQ", provider: "kie_ai", contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_VEO3", baseCreditCost: 125, estimatedTimeSeconds: 300, costMultipliers: {}, apiEndpoint: "/api/v1/veo/generate", payloadStructure: "flat", maxImages: 2, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/google.png",
  modelFamily: "Google",
  variantName: "Veo 3.1 HQ",
  displayOrderInFamily: 3,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Google_Veo_3_1_HQ.ts" } as const;

export const SCHEMA = { properties: { aspectRatio: { default: "16:9", description: "Output video dimensions", enum: ["16:9", "9:16", "1:1"], type: "string" }, endFrame: { description: "Last frame for the video generation (optional)", format: "uri", renderer: "image", title: "End Frame (Optional)", type: "string" }, generationType: { default: "FIRST_AND_LAST_FRAMES_2_VIDEO", showToUser: false, type: "string" }, model: { default: "veo3", showToUser: false, type: "string" }, prompt: { description: "Describe the motion and style", maxLength: 1000, renderer: "prompt", type: "string" }, seeds: { maximum: 99999, minimum: 10000, type: "number" }, startFrame: { description: "First frame for the video generation", format: "uri", renderer: "image", title: "Start Frame", type: "string" } }, required: ["prompt", "startFrame", "model", "generationType"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt && inputs.startFrame ? { valid: true } : { valid: false, error: "Prompt and start frame required" }; }
export function preparePayload(inputs: Record<string, any>) { return { prompt: inputs.prompt, startFrame: inputs.startFrame, endFrame: inputs.endFrame, aspectRatio: inputs.aspectRatio || "16:9", model: "veo3", generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO", seeds: inputs.seeds }; }
export function calculateCost(_inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) { const urls = await uploadImagesToStorage(userId); inputs.startFrame = urls[0]; if (urls[1]) inputs.endFrame = urls[1]; }
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: GENERATION_STATUS.PENDING, settings: sanitizeForStorage(modelParameters) }).select().single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side (edge function will process)
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
