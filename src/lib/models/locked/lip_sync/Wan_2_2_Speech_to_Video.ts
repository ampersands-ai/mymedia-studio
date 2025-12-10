/** Wan 2.2-a14b Speech-to-Video Turbo (lip_sync) - Record: c0d1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Wan 2.2-a14b Speech-to-Video Turbo
 * - Requires: image + audio + prompt
 * - Resolutions: 480p, 580p, 720p
 * - Pricing per second: 480p=6, 580p=9, 720p=12 credits
 * - Extensive control: num_frames, fps, inference steps, guidance scale, etc.
 */
export const MODEL_CONFIG = {
  modelId: "wan/2-2-a14b-speech-to-video-turbo",
  recordId: "c0d1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
  modelName: "Wan 2.2 Speech-to-Video",
  provider: "kie_ai",
  contentType: "lip_sync",
  use_api_key: "KIE_AI_API_KEY_LIP_SYNC",
  baseCreditCost: 30, // Default: 480p × 5s estimate = 6 × 5
  estimatedTimeSeconds: 180,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxAudios: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  costMultipliers: null,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/wan.png",
  modelFamily: "Wan",
  variantName: "2.2-a14b Speech-to-Video Turbo",
  displayOrderInFamily: 5,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/lip_sync/Wan_2_2_Speech_to_Video.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_url",
  audioInputField: "audio_url",
  properties: {
    prompt: {
      maxLength: 5000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt for video generation",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Input Image",
      description: "Image to animate with speech. Will be resized/cropped to match aspect ratio. Formats: jpeg, png, webp (max 10MB)",
      renderer: "image",
    },
    audio_url: {
      type: "string",
      format: "uri",
      title: "Audio File",
      description: "Audio file for lip-sync. Formats: mp3, wav, ogg, m4a, flac, aac, wma (max 10MB)",
      renderer: "audio",
    },
    resolution: {
      default: "480p",
      enum: ["480p", "580p", "720p"],
      enumLabels: {
        "480p": "480p (Budget)",
        "580p": "580p (Standard)",
        "720p": "720p (HD)",
      },
      type: "string",
      title: "Resolution",
    },
    num_frames: {
      type: "integer",
      minimum: 40,
      maximum: 120,
      multipleOf: 4,
      default: 80,
      title: "Number of Frames",
      description: "Must be between 40-120, multiple of 4",
    },
    frames_per_second: {
      type: "integer",
      minimum: 4,
      maximum: 60,
      default: 16,
      title: "Frames Per Second",
      description: "FPS of generated video (4-60). May be multiplied if using interpolation.",
    },
    negative_prompt: {
      maxLength: 500,
      type: "string",
      title: "Negative Prompt",
      description: "Content to avoid in the video",
    },
    seed: {
      type: "integer",
      title: "Seed",
      description: "Random seed for reproducibility (leave empty for random)",
    },
    num_inference_steps: {
      type: "integer",
      minimum: 2,
      maximum: 40,
      default: 27,
      title: "Inference Steps",
      description: "Higher = better quality but slower (2-40)",
    },
    guidance_scale: {
      type: "number",
      minimum: 1,
      maximum: 10,
      multipleOf: 0.1,
      default: 3.5,
      title: "Guidance Scale",
      description: "Prompt adherence strength (1-10). Higher = more literal but may decrease quality.",
    },
    shift: {
      type: "number",
      minimum: 1,
      maximum: 10,
      multipleOf: 0.1,
      default: 5,
      title: "Shift",
      description: "Shift value for video generation (1-10)",
    },
    enable_safety_checker: {
      type: "boolean",
      default: true,
      title: "Safety Checker",
      description: "Check input data for safety before processing",
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

  if (inputs.num_frames !== undefined) {
    if (inputs.num_frames < 40 || inputs.num_frames > 120) {
      return { valid: false, error: "Number of frames must be between 40-120" };
    }
    if (inputs.num_frames % 4 !== 0) {
      return { valid: false, error: "Number of frames must be a multiple of 4" };
    }
  }

  if (inputs.negative_prompt && inputs.negative_prompt.length > 500) {
    return { valid: false, error: "Negative prompt must be 500 characters or less" };
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
  if (inputs.num_frames !== undefined) payload.num_frames = inputs.num_frames;
  if (inputs.frames_per_second !== undefined) payload.frames_per_second = inputs.frames_per_second;
  if (inputs.negative_prompt) payload.negative_prompt = inputs.negative_prompt;
  if (inputs.seed !== undefined && inputs.seed !== null) payload.seed = inputs.seed;
  if (inputs.num_inference_steps !== undefined) payload.num_inference_steps = inputs.num_inference_steps;
  if (inputs.guidance_scale !== undefined) payload.guidance_scale = inputs.guidance_scale;
  if (inputs.shift !== undefined) payload.shift = inputs.shift;
  if (inputs.enable_safety_checker !== undefined) payload.enable_safety_checker = inputs.enable_safety_checker;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const resolution = inputs.resolution || "480p";
  const numFrames = inputs.num_frames || 80;
  const fps = inputs.frames_per_second || 16;

  // Calculate video duration in seconds
  const videoDuration = numFrames / fps;

  // Pricing per second by resolution
  const ratePerSecond: Record<string, number> = {
    "480p": 6,
    "580p": 9,
    "720p": 12,
  };

  return Math.ceil((ratePerSecond[resolution] || 6) * videoDuration);
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, uploadedImages, uploadedAudios, userId, uploadImagesToStorage, uploadAudiosToStorage, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };

  // Upload image
  if (uploadedImages && uploadedImages.length > 0) {
    const imageUrls = await uploadImagesToStorage(userId);
    inputs.image_url = imageUrls[0];
  }

  // Upload audio
  if (uploadedAudios && uploadedAudios.length > 0 && uploadAudiosToStorage) {
    const audioUrls = await uploadAudiosToStorage(userId);
    inputs.audio_url = audioUrls[0];
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
