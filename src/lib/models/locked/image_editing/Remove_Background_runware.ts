/** Remove Background runware (image_editing) - Record: d2f8b5e4-3a9c-4c72-8f61-2e4d9a7b6c3f */
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { deductCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = {
  modelId: "runware:110@1",
  recordId: "d1d8b152-e123-4375-8f55-c0d0a699009b",
  modelName: "Remove Background",
  provider: "runware",
  contentType: "image",
  baseCreditCost: 0.07,
  estimatedTimeSeconds: 15,
  costMultipliers: {},
  apiEndpoint: "https://api.runware.ai/v1",
  payloadStructure: "flat",
  maxImages: 1,
  defaultOutputs: 1,
} as const;

export const SCHEMA = {
  imageInputField: "inputImage",
  properties: {
    includeCost: {
      default: true,
      showToUser: false,
      type: "boolean",
    },
    inputImage: {
      renderer: "image",
      type: "string",
    },
    outputFormat: {
      default: "PNG",
      enum: ["PNG", "JPEG", "WEBP"],
      type: "string",
    },
    outputType: {
      default: ["URL"],
      items: {
        format: "uri",
        type: "string",
      },
      showToUser: false,
      type: "array",
    },
    taskType: {
      default: "imageBackgroundRemoval",
      showToUser: false,
      type: "string",
    },
  },
  required: ["inputImage"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  return inputs.inputImage ? { valid: true } : { valid: false, error: "Image required" };
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    taskType: "imageBackgroundRemoval",
    inputImage: inputs.inputImage,
    outputFormat: inputs.outputFormat || "PNG",
    outputType: ["URL"],
    includeCost: true,
  };
}

export function calculateCost(inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;

  const inputs: Record<string, any> = { ...modelParameters };

  if (uploadedImages.length > 0) {
    inputs.inputImage = (await uploadImagesToStorage(userId))[0];
  }

  const validation = validate(inputs);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cost = calculateCost(inputs);
  await deductCredits(userId, cost);

  const { data: gen, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: MODEL_CONFIG.contentType,
      prompt: prompt || "Remove background",
      tokens_used: cost,
      status: "pending",
      settings: modelParameters,
    })
    .select()
    .single();

  if (error || !gen) {
    throw new Error(`Failed: ${error?.message}`);
  }

  const { data: keyData } = await supabase.functions.invoke("get-api-key", {
    body: {
      provider: MODEL_CONFIG.provider,
      modelId: MODEL_CONFIG.modelId,
      recordId: MODEL_CONFIG.recordId,
    },
  });

  if (!keyData?.apiKey) {
    throw new Error("Failed to retrieve API key");
  }

  const apiPayload = [
    {
      taskType: "authentication",
      apiKey: keyData.apiKey,
    },
    {
      ...preparePayload(inputs),
      taskUUID: gen.id,
    },
  ];

  const res = await fetch(MODEL_CONFIG.apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(apiPayload),
  });

  if (!res.ok) {
    throw new Error(`API failed: ${res.statusText}`);
  }

  const result = await res.json();

  await supabase
    .from("generations")
    .update({
      provider_task_id: result[0]?.taskUUID || gen.id,
      provider_request: apiPayload,
      provider_response: result,
    })
    .eq("id", gen.id);

  // Process the response immediately (Runware is synchronous)
  const { error: processError } = await supabase.functions.invoke("process-runware-response", {
    body: { generation_id: gen.id },
  });

  if (processError) {
    console.error("Failed to process response:", processError);
  }

  startPolling(gen.id);
  return gen.id;
}
