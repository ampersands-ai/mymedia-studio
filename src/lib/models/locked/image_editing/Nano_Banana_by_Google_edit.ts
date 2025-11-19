/** Nano Banana by Google (image_editing) - Record: a70d01a3-05de-4918-b934-55a7e5e5d407 */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";

export const MODEL_CONFIG = { modelId: "google/nano-banana-edit", recordId: "a70d01a3-05de-4918-b934-55a7e5e5d407", modelName: "Nano Banana by Google", provider: "kie_ai", contentType: "image", baseCreditCost: 2, estimatedTimeSeconds: 25, costMultipliers: {}, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 10, defaultOutputs: 1 } as const;

export const SCHEMA = { properties: { aspect_ratio: { default: "1:1", enum: ["1:1", "3:4", "4:3", "9:16", "16:9"], type: "string" }, image_url: { renderer: "image", type: "string" }, mask_url: { renderer: "image", type: "string" }, number_of_images: { default: 1, maximum: 4, minimum: 1, type: "integer" }, prompt: { maxLength: 5000, renderer: "prompt", type: "string" }, seed: { type: "integer" } }, required: ["prompt", "image_url"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { 
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (!inputs.image_url) return { valid: false, error: "Image required" };
  return { valid: true }; 
}

export function preparePayload(inputs: Record<string, any>) { 
  return { 
    modelId: MODEL_CONFIG.modelId, 
    input: { 
      prompt: inputs.prompt, 
      image_url: inputs.image_url,
      aspect_ratio: inputs.aspect_ratio || "1:1", 
      number_of_images: inputs.number_of_images || 1, 
      ...(inputs.mask_url && { mask_url: inputs.mask_url }),
      ...(inputs.seed && { seed: inputs.seed }) 
    } 
  }; 
}

export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost * (inputs.number_of_images || 1); }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, uploadedImages, uploadImagesToStorage, startPolling } = params;
  
  // Upload images to storage first
  const imageUrls = await uploadImagesToStorage(userId);
  if (!imageUrls || imageUrls.length === 0) throw new Error("Failed to upload images");
  
  const inputs: Record<string, any> = { 
    prompt, 
    image_url: imageUrls[0],
    ...(imageUrls[1] && { mask_url: imageUrls[1] }),
    ...modelParameters 
  };
  
  const validation = validate(inputs); 
  if (!validation.valid) throw new Error(validation.error);
  
  const { data: gen, error } = await supabase.from("generations").insert({ 
    user_id: userId, 
    model_id: MODEL_CONFIG.modelId, 
    model_record_id: MODEL_CONFIG.recordId, 
    type: MODEL_CONFIG.contentType, 
    prompt, 
    tokens_used: calculateCost(inputs), 
    status: "pending", 
    settings: modelParameters 
  }).select().single();
  
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);
  
  const apiKey = await getKieApiKey();
  const res = await fetch(`https://api.kie.ai${MODEL_CONFIG.apiEndpoint}`, { 
    method: "POST", 
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, 
    body: JSON.stringify(preparePayload(inputs)) 
  });
  
  if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
  const result = await res.json();
  
  await supabase.from("generations").update({ 
    provider_task_id: result.taskId || result.id, 
    provider_request: preparePayload(inputs), 
    provider_response: result 
  }).eq("id", gen.id);
  
  startPolling(gen.id);
  return gen.id;
}

import { getKieApiKey as getCentralKieApiKey } from "../getKieApiKey";

async function getKieApiKey(): Promise<string> {
  return getCentralKieApiKey(MODEL_CONFIG.modelId, MODEL_CONFIG.recordId);
}
