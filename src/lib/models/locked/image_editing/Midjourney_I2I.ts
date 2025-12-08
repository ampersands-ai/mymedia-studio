/**
 * Midjourney Image-to-Image Model
 * 
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 * 
 * @locked
 * @model midjourney/image-to-image
 * @provider kie.ai
 * @version 1.0.0
 */

import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

export const MODEL_CONFIG = {
  modelId: "midjourney/image-to-image",
  recordId: "f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c",
  modelName: "Midjourney I2I",
  provider: "kie_ai",
  contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_EDITING",
  baseCreditCost: 2,
  estimatedTimeSeconds: 60,
  costMultipliers: null,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxFileSize: 10 * 1024 * 1024,
  defaultOutputs: 1,
  isActive: true,
  logoUrl: null,
  modelFamily: "Midjourney",
  variantName: "Midjourney I2I",
  displayOrderInFamily: 1,
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Midjourney_I2I.ts",
} as const;

// ============================================================================
// FROZEN SCHEMA - DO NOT MODIFY
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["prompt", "image_url"],
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      default: "",
      description: "Describe what you want to generate",
      maxLength: 2000,
      renderer: "prompt",
    },
    image_url: {
      type: "string",
      title: "Reference Image",
      default: "",
      description: "Upload an image to transform",
      renderer: "image",
    },
  },
});

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  return {
    prompt: inputs.prompt || "",
    image_url: inputs.image_url || "",
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(_inputs: Record<string, unknown>): number {
  return MODEL_CONFIG.baseCreditCost;
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.prompt || (typeof inputs.prompt === "string" && inputs.prompt.trim() === "")) {
    return { valid: false, error: "Prompt is required" };
  }

  if (!inputs.image_url || (typeof inputs.image_url === "string" && inputs.image_url.trim() === "")) {
    return { valid: false, error: "Reference image is required" };
  }

  return { valid: true };
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, startPolling } = params;

  const allInputs = { ...modelParameters, prompt };

  const validation = validate(allInputs);
  if (!validation.valid) {
    throw new Error(validation.error || "Validation failed");
  }

  const cost = calculateCost(allInputs);

  await reserveCredits(userId, cost);

  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      prompt: prompt,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: getGenerationType(MODEL_CONFIG.contentType),
      status: GENERATION_STATUS.PROCESSING,
      tokens_used: cost,
      settings: sanitizeForStorage(modelParameters),
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    throw new Error(`Failed to create generation record: ${insertError?.message}`);
  }

  const generationId = generation.id;

  const { error: functionError } = await supabase.functions.invoke("generate-content", {
    body: {
      generation_id: generationId,
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      prompt: prompt,
      custom_parameters: preparePayload(allInputs),
      cost: cost,
      use_api_key: MODEL_CONFIG.use_api_key,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
    },
  });

  if (functionError) {
    throw new Error(`Generation failed: ${functionError.message}`);
  }

  startPolling(generationId);

  return generationId;
}

export default {
  MODEL_CONFIG,
  SCHEMA,
  preparePayload,
  calculateCost,
  validate,
  execute,
};
