/** Seedream V1 Pro (image_to_video) - Record: e6d9a4f7-2c5b-8f3e-9a7d-4c8f5b6e3a9d */
import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = { modelId: "bytedance/v1-pro-image-to-video", recordId: "50eb3f02-1e58-4b85-a535-e8391a5623c4", modelName: "Seedream V1 Pro", provider: "kie_ai", contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO", baseCreditCost: 8, estimatedTimeSeconds: 300, costMultipliers: { duration: { "3": 1, "4": 1.33, "5": 1.66, "6": 2, "7": 2.33, "8": 2.66, "9": 3, "10": 3.33 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 1, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/seedream.png",
  modelFamily: "Seedream",
  variantName: "Seedream V1 Pro",
  displayOrderInFamily: 3,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Seedream_V1_Pro.ts" } as const;

export const SCHEMA = { properties: { aspect_ratio: { default: "3:4", enum: ["1:1", "3:4", "4:3", "9:16", "16:9"], type: "string" }, duration: { default: "3", enum: ["3", "4", "5", "6", "7", "8", "9", "10"], type: "string" }, image_url: { type: "string" }, prompt: { type: "string" } }, required: ["prompt", "image_url"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt && inputs.image_url ? { valid: true } : { valid: false, error: "Prompt and image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, image_url: inputs.image_url, duration: inputs.duration || "3", aspect_ratio: inputs.aspect_ratio || "3:4" } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost * (MODEL_CONFIG.costMultipliers.duration[parseInt(inputs.duration || "3")] || 1); }

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
