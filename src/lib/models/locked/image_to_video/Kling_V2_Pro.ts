/** Kling V2 Pro (image_to_video) - Record: 84084ca4-4153-46bc-8d01-cd4e37d1da68 */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Kling V2 Pro supports optional tail_image_url for end frame
 * - First image: start frame (required)
 * - Second image: end frame (optional)
 */
export const MODEL_CONFIG = {
  modelId: "kling/v2-1-pro",
  recordId: "84084ca4-4153-46bc-8d01-cd4e37d1da68",
  modelName: "Kling V2.1 Pro",
  provider: "kie_ai",
  contentType: "image_to_video",
  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
  baseCreditCost: 25,
  estimatedTimeSeconds: 300,
  costMultipliers: { duration: { "5": 1, "10": 2 } },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 2, // Supports start + optional end frame
  maxFileSize: 10 * 1024 * 1024, // 10MB per image
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/kling.png",
  modelFamily: "Kling",
  variantName: "Kling V2.1 Pro",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/image_to_video/Kling_V2_Pro.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  properties: {
    prompt: {
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt describing the video to generate",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Start Frame",
      description: "URL of start frame image. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    tail_image_url: {
      type: "string",
      format: "uri",
      title: "End Frame (Optional)",
      description: "URL of end frame image for transitions. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    duration: {
      default: "5",
      enum: ["5", "10"],
      enumLabels: {
        "5": "5 seconds",
        "10": "10 seconds",
      },
      type: "string",
    },
    negative_prompt: {
      default: "blur, distort, and low quality",
      maxLength: 500,
      type: "string",
      description: "Terms to avoid in the generated video",
    },
    cfg_scale: {
      type: "number",
      minimum: 0,
      maximum: 1,
      step: 0.1,
      default: 0.5,
      title: "CFG Scale",
      description: "How closely to follow the prompt (0-1)",
      showToUser: false,
    },
  },
  required: ["prompt", "image_url"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (!inputs.image_url) return { valid: false, error: "Start frame image required" };
  if (inputs.prompt.length > 5000) return { valid: false, error: "Prompt must be 5000 characters or less" };
  if (inputs.negative_prompt && inputs.negative_prompt.length > 500) {
    return { valid: false, error: "Negative prompt must be 500 characters or less" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    image_url: inputs.image_url,
    duration: inputs.duration || "5",
  };

  if (inputs.tail_image_url) payload.tail_image_url = inputs.tail_image_url;
  if (inputs.negative_prompt) payload.negative_prompt = inputs.negative_prompt;
  if (inputs.cfg_scale !== undefined) payload.cfg_scale = inputs.cfg_scale;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const durKey = String(inputs.duration || "5") as keyof typeof MODEL_CONFIG.costMultipliers.duration;
  return MODEL_CONFIG.baseCreditCost * (MODEL_CONFIG.costMultipliers.duration[durKey] || 1);
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };

  // Upload images - first is start frame, second (if present) is end frame
  if (uploadedImages.length > 0) {
    const urls = await uploadImagesToStorage(userId);
    inputs.image_url = urls[0];
    if (urls[1]) inputs.tail_image_url = urls[1];
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

// ============================================================================
// STORYBOARD DEFAULTS
// ============================================================================

import type { StoryboardContext, StoryboardDefaults } from '@/lib/models/types/storyboard';

/**
 * Storyboard-optimized defaults for Kling V2.1 Pro I2V
 * Returns exact parameters accepted by kie_ai provider
 * Supports end frame via tail_image_url (if connected to next scene)
 */
export function getStoryboardDefaults(ctx: StoryboardContext): StoryboardDefaults {
  const result: StoryboardDefaults = {
    prompt: ctx.prompt,
    image_url: ctx.inputImage || "",
    duration: "5",                              // Shortest option (5s)
    negative_prompt: "blur, distort, low quality",
    cfg_scale: 0.5,                             // Balanced prompt adherence
  };
  
  // Add tail_image_url if connecting to next scene
  if (ctx.connectToNextScene && ctx.nextSceneImage) {
    result.tail_image_url = ctx.nextSceneImage;
  }
  
  return result;
}
