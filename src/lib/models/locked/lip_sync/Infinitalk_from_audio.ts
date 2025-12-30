/** Infinitalk from-audio (lip_sync) - Record: a9b0c1d2-3e4f-5a6b-7c8d-9e0f1a2b3c4d */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Infinitalk from-audio
 * - Requires: image + audio + prompt
 * - Resolutions: 480p, 720p
 * - Pricing per second: 480p=1.5, 720p=6 credits
 * - Max 15 seconds per generation
 */
export const MODEL_CONFIG = {
  modelId: "infinitalk/from-audio",
  recordId: "a9b0c1d2-3e4f-5a6b-7c8d-9e0f1a2b3c4d",
  modelName: "Infinitalk",
  provider: "kie_ai",
  contentType: "lip_sync",
  use_api_key: "KIE_AI_API_KEY_LIP_SYNC",
  baseCreditCost: 7.5, // Default: 480p × 5s estimate = 1.5 × 5
  estimatedTimeSeconds: 120,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxAudios: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxAudioDuration: 14, // Max 15 seconds
  defaultOutputs: 1,
  costMultipliers: null,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/artifio.png",
  modelFamily: "Infinitalk",
  variantName: "from-audio",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/lip_sync/Infinitalk_from_audio.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  audioInputField: "audio_url",
  properties: {
    prompt: {
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt to guide video generation",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Input Image",
      description: "Image to animate with speech. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    audio_url: {
      type: "string",
      format: "uri",
      title: "Audio File",
      description: "Audio file for lip-sync (max 15 seconds). Formats: mp3, wav, aac, mp4, ogg (max 10MB)",
      renderer: "audio",
    },
    resolution: {
      default: "480p",
      enum: ["480p", "720p"],
      enumLabels: {
        "480p": "480p (Standard - 1.5 credits/s)",
        "720p": "720p (HD - 6 credits/s)",
      },
      type: "string",
      title: "Resolution",
    },
    seed: {
      type: "integer",
      minimum: 10000,
      maximum: 1000000,
      title: "Seed",
      showToUser: false,
      description: "Random seed for reproducibility (10000-1000000)",
    },
  },
  required: ["prompt", "image_url", "audio_url"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length > 5000) return { valid: false, error: "Prompt must be 5000 characters or less" };
  if (!inputs.image_url) return { valid: false, error: "Image required" };
  if (!inputs.audio_url) return { valid: false, error: "Audio file required" };

  if (inputs.seed !== undefined && inputs.seed !== null) {
    if (inputs.seed < 10000 || inputs.seed > 1000000) {
      return { valid: false, error: "Seed must be between 10000 and 1000000" };
    }
  }

  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
    image_url: inputs.image_url,
    audio_url: inputs.audio_url,
  };

  if (inputs.resolution) payload.resolution = inputs.resolution;
  if (inputs.seed !== undefined && inputs.seed !== null) payload.seed = inputs.seed;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, any>, audioDurationSeconds?: number) {
  const resolution = inputs.resolution || "480p";
  // Default to 5 seconds if audio duration not provided
  const duration = audioDurationSeconds || 5;

  // Pricing per second by resolution
  const ratePerSecond: Record<string, number> = {
    "480p": 1.5,
    "720p": 6,
  };

  // Cap at 15 seconds
  const cappedDuration = Math.min(duration, 15);
  return Math.ceil((ratePerSecond[resolution] || 1.5) * cappedDuration);
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const {
    prompt,
    modelParameters,
    uploadedImages,
    uploadedAudios,
    userId,
    uploadImagesToStorage,
    uploadAudiosToStorage,
    startPolling,
    getAudioDuration,
  } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };

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
    // Get audio duration if function available
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
      prompt,
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
      prompt,
      custom_parameters: preparePayload(inputs),
      preCalculatedCost: cost,
    },
  });

  if (funcError) {
    await supabase.from("generations").update({ status: GENERATION_STATUS.FAILED }).eq("id", gen.id);
    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  startPolling(gen.id);
  return gen.id;
}
