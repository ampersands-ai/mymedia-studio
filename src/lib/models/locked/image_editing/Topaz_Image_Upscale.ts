/**
 * Topaz Image Upscale
 * 
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 * 
 * AI-powered image upscaling
 * - Endpoint: /api/v1/jobs/createTask (wrapper structure)
 * - Image field: image_url (STRING, not array)
 * - Upscale factors: 1x, 2x, 4x, 8x
 * - Pricing: 5 credits (≤2K), 10 credits (4K), 20 credits (8K)
 * 
 * @locked
 * @model topaz/image-upscale
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
  modelId: "topaz/image-upscale",
  recordId: "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  modelName: "Topaz Image Upscale",
  provider: "kie_ai",
  contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_IMAGE",
  baseCreditCost: 5,
  estimatedTimeSeconds: 60,
  costMultipliers: {
    upscale_factor: {
      "1": 1,
      "2": 1,
      "4": 2,
      "8": 4,
    },
  },
  pricingTable: {
    "1": 5,  // ≤2K
    "2": 5,  // ≤2K
    "4": 10, // 4K
    "8": 20, // 8K
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/topaz.png",
  modelFamily: "Topaz",
  variantName: "Image Upscale",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_editing/Topaz_Image_Upscale.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["image_url", "upscale_factor"],
  imageInputField: "image_url", // STRING field (not array)
  properties: {
    image_url: {
      type: "string",
      format: "uri",
      title: "Input Image",
      description: "Image to upscale. Accepted: JPEG, PNG, WebP. Max 10MB.",
      renderer: "image",
    },
    upscale_factor: {
      type: "string",
      title: "Upscale Factor",
      default: "2",
      enum: ["1", "2", "4", "8"],
      enumLabels: {
        "1": "1x - Original (5 credits)",
        "2": "2x - Double (5 credits)",
        "4": "4x - 4K (10 credits)",
        "8": "8x - 8K (20 credits)",
      },
      description: "Factor to upscale image. Higher = larger output.",
    },
  },
  "x-order": ["image_url", "upscale_factor"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.image_url || (typeof inputs.image_url === "string" && inputs.image_url.trim() === "")) {
    return { valid: false, error: "Input image is required" };
  }

  if (!inputs.upscale_factor) {
    return { valid: false, error: "Upscale factor is required" };
  }

  if (!["1", "2", "4", "8"].includes(inputs.upscale_factor as string)) {
    return { valid: false, error: "Upscale factor must be 1, 2, 4, or 8" };
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
      image_url: inputs.image_url || "",
      upscale_factor: inputs.upscale_factor || "2",
    },
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  const factor = (inputs.upscale_factor || "2") as "1" | "2" | "4" | "8";
  return MODEL_CONFIG.pricingTable[factor];
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, modelParameters, uploadedImages, uploadImagesToStorage, startPolling } = params;

  const allInputs: Record<string, unknown> = { ...modelParameters };

  // Upload image and get URL (single string, not array)
  if (uploadedImages && uploadedImages.length > 0) {
    const imageUrls = await uploadImagesToStorage(userId);
    allInputs.image_url = imageUrls[0]; // Single URL
  }

  const validation = validate(allInputs);
  if (!validation.valid) throw new Error(validation.error || "Validation failed");

  const cost = calculateCost(allInputs);
  await reserveCredits(userId, cost);

  // Generate a description for the upscale operation
  const factor = allInputs.upscale_factor || "2";
  const description = `Image upscale ${factor}x`;

  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      prompt: description,
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
      prompt: description,
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
