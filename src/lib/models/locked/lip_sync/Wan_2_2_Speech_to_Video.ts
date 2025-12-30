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
 * - Pricing per second: 480p=12, 580p=9, 720p=12 credits
 */
export const MODEL_CONFIG = {
  modelId: "wan/2-2-a14b-speech-to-video-turbo",
  recordId: "c0d1e2f3-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
  modelName: "Wan 2.2 Speech-to-Video",
  provider: "kie_ai",
  contentType: "lip_sync",
  use_api_key: "KIE_AI_API_KEY_LIP_SYNC",
  baseCreditCost: 45, // Default: 580p × 5s = 9 × 5
  estimatedTimeSeconds: 180,
  pricingPerSecond: {
    "480p": 6,
    "580p": 9,
    "720p": 12,
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxAudios: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/wan.png",
  modelFamily: "Wan",
  variantName: "2.2 Speech-to-Video",
  displayOrderInFamily: 5,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/lip_sync/Wan_2_2_Speech_to_Video.ts",
} as const;

export const SCHEMA = {
  type: "object",
  required: ["prompt", "image_url", "audio_url"],
  imageInputField: "image_url",
  audioInputField: "audio_url",
  properties: {
    // ========== CORE FIELDS (Always visible) ==========
    prompt: {
      type: "string",
      title: "Prompt",
      description: "Text prompt for video generation",
      maxLength: 5000,
      renderer: "prompt",
    },
    image_url: {
      type: "string",
      format: "uri",
      title: "Input Image",
      description: "Image to animate. Formats: JPEG, PNG, WebP (max 10MB)",
      renderer: "image",
    },
    audio_url: {
      type: "string",
      format: "uri",
      title: "Audio File",
      description: "Audio for lip-sync. Formats: MP3, WAV, OGG, M4A (max 10MB)",
      renderer: "audio",
      maxDuration: 14,
    },
    resolution: {
      type: "string",
      title: "Resolution",
      default: "580p",
      enum: ["480p", "580p", "720p"],
      enumLabels: {
        "480p": "480p (12 credits/s)",
        "580p": "580p (9 credits/s)",
        "720p": "720p (12 credits/s)",
      },
      description: "Output video resolution",
    },

    // ========== ADVANCED FIELDS ==========
    negative_prompt: {
      type: "string",
      title: "Negative Prompt",
      default: "",
      maxLength: 500,
      description: "Content to avoid in the video",
    },
    seed: {
      type: "integer",
      title: "Seed",
      default: -1,
      minimum: -1,
      maximum: 2147483647,
      showToUser: false,
      description: "Random seed for reproducibility (-1 = random)",
      isAdvanced: true,
    },

    // ========== HIDDEN FIELDS (Use defaults) ==========
    num_frames: {
      type: "integer",
      title: "Number of Frames",
      default: 80,
      minimum: 40,
      maximum: 120,
      multipleOf: 4,
      description: "Must be 40-120, multiple of 4",
      isAdvanced: true,
      showToUser: false,
    },
    frames_per_second: {
      type: "integer",
      title: "Frames Per Second",
      default: 16,
      minimum: 4,
      maximum: 60,
      description: "FPS of generated video",
      isAdvanced: true,
      showToUser: false,
    },
    num_inference_steps: {
      type: "integer",
      title: "Inference Steps",
      default: 27,
      minimum: 2,
      maximum: 40,
      description: "Higher = better quality but slower",
      isAdvanced: true,
      showToUser: false,
    },
    guidance_scale: {
      type: "number",
      title: "Guidance Scale",
      default: 3.5,
      minimum: 1,
      maximum: 10,
      step: 0.1,
      description: "Prompt adherence strength",
      isAdvanced: true,
      showToUser: false,
    },
    shift: {
      type: "number",
      title: "Shift",
      default: 5,
      minimum: 1,
      maximum: 10,
      step: 0.1,
      description: "Shift value for video generation",
      isAdvanced: true,
      showToUser: false,
    },
    enable_safety_checker: {
      type: "boolean",
      title: "Safety Checker",
      default: true,
      description: "Check input data for safety",
      isAdvanced: true,
      showToUser: false,
    },
  },
  "x-order": ["prompt", "image_url", "audio_url", "resolution"],
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

  // Core
  if (inputs.resolution) payload.resolution = inputs.resolution;

  // Advanced (only if provided)
  if (inputs.negative_prompt) payload.negative_prompt = inputs.negative_prompt;
  if (inputs.seed !== undefined && inputs.seed !== -1) payload.seed = inputs.seed;

  // Hidden (only if explicitly set, otherwise use API defaults)
  if (inputs.num_frames !== undefined) payload.num_frames = inputs.num_frames;
  if (inputs.frames_per_second !== undefined) payload.frames_per_second = inputs.frames_per_second;
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
  const resolution = inputs.resolution || "580p";
  const numFrames = inputs.num_frames || 81;
  const fps = inputs.frames_per_second || 16;

  // Calculate video duration in seconds
  const videoDuration = numFrames / fps;

  // Pricing per second by resolution
  const ratePerSecond = MODEL_CONFIG.pricingPerSecond[resolution as keyof typeof MODEL_CONFIG.pricingPerSecond] || 9;

  return Math.ceil(ratePerSecond * videoDuration);
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
  } = params;
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

export default { MODEL_CONFIG, SCHEMA, preparePayload, calculateCost, validate, execute };
