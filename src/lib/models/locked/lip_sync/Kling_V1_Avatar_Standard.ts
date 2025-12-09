/** Kling V1 Avatar Standard (lip_sync) - Record: a7b8c9d0-1e2f-3a4b-5c6d-7e8f9a0b1c2d */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Kling V1 Avatar Standard
 * - Requires: image + audio (prompt optional in example but in schema)
 * - Fixed 720p resolution
 * - Pricing: 4 credits/second
 * - Max 15 seconds per generation
 */
export const MODEL_CONFIG = {
  modelId: "kling/v1-avatar-standard",
  recordId: "a7b8c9d0-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
  modelName: "Kling Avatar Standard",
  provider: "kie_ai",
  contentType: "lip_sync",
  use_api_key: "KIE_AI_API_KEY_LIP_SYNC",
  baseCreditCost: 20, // Default: 720p × 5s estimate = 4 × 5
  estimatedTimeSeconds: 120,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxAudios: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxAudioDuration: 15, // Max 15 seconds
  defaultOutputs: 1,
  costMultipliers: null,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/kling.png",
  modelFamily: "Kling Avatar",
  variantName: "V1 Standard (720p)",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/lip_sync/Kling_V1_Avatar_Standard.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  audioInputField: "audio_url",
  properties: {
    prompt: {
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt to guide video generation (optional)",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Avatar Image",
      description: "Image to use as your avatar. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    audio_url: {
      type: "string",
      format: "uri",
      title: "Audio File",
      description: "Audio file for lip-sync (max 15 seconds). Formats: mp3, wav, aac, mp4, ogg (max 10MB)",
      renderer: "audio",
    },
  },
  required: ["image_url", "audio_url"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.image_url) return { valid: false, error: "Avatar image required" };
  if (!inputs.audio_url) return { valid: false, error: "Audio file required" };
  if (inputs.prompt && inputs.prompt.length > 5000) {
    return { valid: false, error: "Prompt must be 5000 characters or less" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    image_url: inputs.image_url,
    audio_url: inputs.audio_url,
  };

  // Prompt is optional
  if (inputs.prompt) payload.prompt = inputs.prompt;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(_inputs: Record<string, any>, audioDurationSeconds?: number) {
  // Fixed 720p at 4 credits/second
  const ratePerSecond = 4;
  // Default to 5 seconds if audio duration not provided
  const duration = audioDurationSeconds || 5;
  // Cap at 15 seconds
  const cappedDuration = Math.min(duration, 15);
  return Math.round(ratePerSecond * cappedDuration * 100) / 100;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, uploadedAudios, userId, uploadImagesToStorage, uploadAudiosToStorage, startPolling, getAudioDuration } = params;
  const inputs: Record<string, any> = { ...modelParameters };
  if (prompt) inputs.prompt = prompt;

  // Upload image
  if (uploadedImages && uploadedImages.length > 0) {
    const imageUrls = await uploadImagesToStorage(userId);
    inputs.image_url = imageUrls[0];
  }

  // Upload audio and get duration
  let audioDuration: number | undefined;
  if (uploadedAudios && uploadedAudios.length > 0 && uploadAudiosToStorage) {
    const audioUrls = await uploadAudiosToStorage(userId);
    inputs.audio_url = audioUrls[0];
    if (getAudioDuration) {
      audioDuration = await getAudioDuration(uploadedAudios[0]);
    }
  }

  const validation = validate(inputs);
  if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs, audioDuration);
  await reserveCredits(userId, cost);

  const { data: gen, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: getGenerationType(MODEL_CONFIG.contentType),
      prompt: prompt || "Avatar video generation",
      tokens_used: cost,
      status: GENERATION_STATUS.PENDING,
      settings: sanitizeForStorage(modelParameters),
    })
    .select()
    .single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  const { error: funcError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt: prompt || "",
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
