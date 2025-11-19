/**
 * ISOLATED MODEL FILE: Google Image Upscale (Image Editing)
 * 
 * Model ID: nano-banana-upscale
 * Record ID: 2959b083-2177-4b8c-ae56-31170c2eb9dc
 * Provider: kie_ai
 * Content Type: image
 */

import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";

export const MODEL_CONFIG = {
  modelId: "nano-banana-upscale",
  recordId: "2959b083-2177-4b8c-ae56-31170c2eb9dc",
  modelName: "Google Image Upscale",
  provider: "kie_ai",
  contentType: "image",
  baseCreditCost: 0.25,
  estimatedTimeSeconds: 18,
  costMultipliers: {},
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  defaultOutputs: 1,
} as const;

export const SCHEMA = {
  "imageInputField": "image",
  "properties": {
    "face_enhance": {
      "default": false,
      "description": "AI-powered facial enhancement",
      "enum": [true, false],
      "showToUser": false,
      "type": "boolean"
    },
    "image": {
      "description": "Choose file to transform 🎨",
      "renderer": "image",
      "type": "string"
    },
    "scale": {
      "default": 2,
      "description": "How big? We'll enhance and apply digital zoom. (2x-4x)",
      "enum": [1, 2, 3, 4],
      "type": "number"
    }
  },
  "required": ["image"],
  "type": "object"
} as const;

export function validate(inputs: Record<string, any>): { valid: boolean; error?: string } {
  if (!inputs.image) return { valid: false, error: "Image is required" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>): Record<string, any> {
  return {
    modelId: MODEL_CONFIG.modelId,
    input: {
      image: inputs.image,
      scale: inputs.scale || 2,
      face_enhance: false,
    }
  };
}

export function calculateCost(inputs: Record<string, any>): number {
  return MODEL_CONFIG.baseCreditCost;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  
  const inputs = { ...modelParameters };
  const validation = validate(inputs);
  if (!validation.valid) throw new Error(validation.error);
  
  if (uploadedImages.length > 0) {
    const imageUrls = await uploadImagesToStorage(userId);
    inputs.image = imageUrls[0];
  }
  
  const cost = calculateCost(inputs);
  
  const { data: generation, error: genError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: MODEL_CONFIG.contentType,
      prompt: prompt || "Image upscale",
      tokens_used: cost,
      status: "pending",
      settings: modelParameters,
    })
    .select()
    .single();
  
  if (genError || !generation) throw new Error(`Failed to create generation: ${genError?.message}`);
  
  const payload = preparePayload(inputs);
  const apiKey = await getKieApiKey();
  
  const response = await fetch(`https://api.kie.ai${MODEL_CONFIG.apiEndpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) throw new Error(`API call failed: ${response.statusText}`);
  const result = await response.json();
  
  await supabase.from("generations").update({
    provider_task_id: result.taskId || result.id,
    provider_request: payload,
    provider_response: result,
  }).eq("id", generation.id);
  
  startPolling(generation.id);
  return generation.id;
}

async function getKieApiKey(): Promise<string> {
  // TODO: Implement proper secrets management
  throw new Error("KIE_API_KEY needs to be configured in secrets");
}
