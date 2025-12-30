/**
 * GPT Image 1.5 Text-to-Image
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * Photorealistic image generation
 * - Endpoint: /api/v1/jobs/createTask (wrapper structure)
 * - Aspect ratios: 1:1, 2:3, 3:2
 * - Quality: medium (balanced), high (slow/detailed)
 *
 * @locked
 * @model gpt-image/1.5-text-to-image
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
  modelId: "gpt-image/1.5-text-to-image",
  recordId: "b2c3d4e5-6a7b-8c9d-0e1f-2a3b4c5d6e7f",
  modelName: "GPT Image 1.5",
  provider: "kie_ai",
  contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 4, // Medium quality
  estimatedTimeSeconds: 30,
  costMultipliers: {
    quality: {
      medium: 1,
      high: 2.75,
    },
  },
  pricingTable: {
    medium: 4,
    high: 11,
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/openai.png",
  modelFamily: "OpenAI",
  variantName: "ChatGPT 1.5",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/GPT_Image_1_5_T2I.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["prompt", "aspect_ratio", "quality"],
  properties: {
    prompt: {
      type: "string",
      title: "Prompt",
      default: "",
      description: "A text description of the image you want to generate",
      maxLength: 1000,
      renderer: "prompt",
    },
    aspect_ratio: {
      type: "string",
      title: "Aspect Ratio",
      default: "1:1",
      enum: ["1:1", "2:3", "3:2"],
      enumLabels: {
        "1:1": "Square (1:1)",
        "2:3": "Portrait (2:3)",
        "3:2": "Landscape (3:2)",
      },
      description: "Width-height ratio of the image",
    },
    quality: {
      type: "string",
      title: "Quality",
      default: "medium",
      enum: ["medium", "high"],
      enumLabels: {
        medium: "Medium (4 credits)",
        high: "High (11 credits)",
      },
      description: "Image quality level",
    },
  },
  "x-order": ["prompt", "aspect_ratio", "quality"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.prompt || (typeof inputs.prompt === "string" && inputs.prompt.trim() === "")) {
    return { valid: false, error: "Prompt is required" };
  }
  if (typeof inputs.prompt === "string" && inputs.prompt.length > 1000) {
    return { valid: false, error: "Prompt must be 1000 characters or less" };
  }

  if (!inputs.aspect_ratio) {
    return { valid: false, error: "Aspect ratio is required" };
  }

  if (!inputs.quality) {
    return { valid: false, error: "Quality is required" };
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  return {
    model: MODEL_CONFIG.modelId,
    input: {
      prompt: inputs.prompt || "",
      aspect_ratio: inputs.aspect_ratio || "1:1",
      quality: inputs.quality || "medium",
    },
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  const quality = (inputs.quality || "medium") as "medium" | "high";
  return MODEL_CONFIG.pricingTable[quality];
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, startPolling } = params;

  const allInputs: Record<string, unknown> = { ...modelParameters, prompt };

  const validation = validate(allInputs);
  if (!validation.valid) throw new Error(validation.error || "Validation failed");

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

  if (insertError || !generation) throw new Error(`Failed to create generation record: ${insertError?.message}`);

  const { error: functionError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: generation.id,
      userId: userId,
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

  if (functionError) throw new Error(`Generation failed: ${functionError.message}`);

  startPolling(generation.id);
  return generation.id;
}

export default { MODEL_CONFIG, SCHEMA, preparePayload, calculateCost, validate, execute };
