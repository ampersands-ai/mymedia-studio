/** Runway (image_to_video) - Record: b8f9c5e2-6d4a-3f7b-9e8c-5a7d3f6b4e9a */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "runway-duration-5-generate", recordId: "d2c37239-d544-4cce-bd8d-fb48ea44b287", modelName: "Runway", provider: "kie_ai", contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO", baseCreditCost: 10, estimatedTimeSeconds: 300, costMultipliers: {}, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/runway.png",
  modelFamily: "Runway",
  variantName: "Runway",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Runway.ts" } as const;

export const SCHEMA = { properties: { duration: { default: "5", enum: ["5", "10"], type: "string" }, image_url: { type: "string" }, prompt: { type: "string" } }, required: ["prompt", "image_url"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt && inputs.image_url ? { valid: true } : { valid: false, error: "Prompt and image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, image_url: inputs.image_url, duration: inputs.duration || "5" } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
  if (uploadedImages.length > 0) inputs.image_url = (await uploadImagesToStorage(userId))[0];
  const validation = validate(inputs); if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);
  const { data: gen, error } = await supabase.from("generations").insert({ user_id: userId, model_id: MODEL_CONFIG.modelId, model_record_id: MODEL_CONFIG.recordId, type: getGenerationType(MODEL_CONFIG.contentType), prompt, tokens_used: cost, status: "pending", settings: modelParameters }).select().single();
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
    await supabase.from('generations').update({ status: 'failed' }).eq('id', gen.id);
    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  startPolling(gen.id);
  return gen.id;
}

