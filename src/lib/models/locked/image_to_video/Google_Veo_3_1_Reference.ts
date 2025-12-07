/** Google Veo 3.1 Reference (image_to_video) - Record: 6e8a863e-8630-4eef-bdbb-5b41f4c883f9 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * REFERENCE_2_VIDEO mode - Material-to-video generation
 * IMPORTANT: Only supports veo3_fast model and 16:9 aspect ratio
 * Uses 1-3 reference images to generate video
 */
export const MODEL_CONFIG = {
  modelId: "veo3_fast",
  recordId: "6e8a863e-8630-4eef-bdbb-5b41f4c883f9",
  modelName: "Google Veo 3.1 Reference",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_VEO3",
  baseCreditCost: 30,
  estimatedTimeSeconds: 300,
  costMultipliers: {},
  apiEndpoint: "/api/v1/veo/generate",
  payloadStructure: "flat",
  maxImages: 3,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/google.png",
  modelFamily: "Google",
  variantName: "Veo 3.1 Reference",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Google_Veo_3_1_Reference.ts",
} as const;

export const SCHEMA = {
  imageInputField: "imageUrls",
  properties: {
    prompt: {
      renderer: "prompt",
      type: "string",
      description: "Describe the video content based on reference materials",
    },
    imageUrls: {
      type: "array",
      title: "Reference Images",
      description: "1-3 reference images for material-to-video generation",
      renderer: "image",
      items: { type: "string", format: "uri" },
      minItems: 1,
      maxItems: 3,
    },
    // REFERENCE_2_VIDEO only supports 16:9 - locked to this value
    aspectRatio: {
      default: "16:9",
      enum: ["16:9"],
      type: "string",
      description: "Reference mode only supports 16:9 aspect ratio",
    },
    seeds: {
      type: "integer",
      minimum: 10000,
      maximum: 99999,
      description: "Random seed for reproducible generation",
      showToUser: false,
    },
    enableTranslation: {
      type: "boolean",
      default: true,
      description: "Automatically translate prompts to English",
      showToUser: false,
    },
    watermark: {
      type: "string",
      description: "Watermark text to add to video",
      showToUser: false,
    },
  },
  required: ["prompt", "imageUrls"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (!inputs.imageUrls || inputs.imageUrls.length === 0) {
    return { valid: false, error: "At least one reference image is required" };
  }
  if (inputs.imageUrls.length > 3) {
    return { valid: false, error: "Maximum 3 reference images allowed" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    imageUrls: inputs.imageUrls,
    model: MODEL_CONFIG.modelId, // veo3_fast only for REFERENCE mode
    generationType: "REFERENCE_2_VIDEO",
    aspectRatio: "16:9", // REFERENCE mode only supports 16:9
    enableTranslation: inputs.enableTranslation !== false,
  };

  if (inputs.seeds !== undefined && inputs.seeds >= 10000 && inputs.seeds <= 99999) {
    payload.seeds = inputs.seeds;
  }
  if (inputs.watermark) payload.watermark = inputs.watermark;

  return payload;
}

export function calculateCost(_inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };

  // Upload images and get URLs
  if (uploadedImages.length > 0) {
    inputs.imageUrls = await uploadImagesToStorage(userId);
  }

  const validation = validate(inputs);
  if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);

  const { data: gen, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: getGenerationType(MODEL_CONFIG.contentType),
      prompt,
      tokens_used: cost,
      status: GENERATION_STATUS.PENDING,
      settings: sanitizeForStorage(modelParameters),
    })
    .select()
    .single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side
  const { error: funcError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt,
      custom_parameters: preparePayload(inputs),
    },
  });

  if (funcError) {
    await supabase.from("generations").update({ status: GENERATION_STATUS.FAILED }).eq("id", gen.id);
    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  startPolling(gen.id);
  return gen.id;
}
