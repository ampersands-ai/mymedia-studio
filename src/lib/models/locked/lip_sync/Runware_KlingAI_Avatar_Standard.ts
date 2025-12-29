/**
 * Runware KlingAI Avatar 2.0 Standard (Image + Audio to Video)
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * NEW PROVIDER: Runware (KlingAI via Runware)
 * - External endpoint: https://api.runware.ai/v1
 * - Payload: ARRAY of task objects (unique structure)
 * - Uses taskType: "videoInference"
 * - Uses inputs.image and inputs.audio (nested structure)
 * - Audio-driven avatar/lip-sync generation
 * - Duration determined by audio length
 * - Minimal parameters (no dimensions, fps, quality)
 *
 * @locked
 * @model klingai:avatar@2.0-standard
 * @provider runware
 * @version 1.0.0
 */

import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";
import { extractEdgeFunctionError } from "@/lib/utils/edge-function-error";

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

export const MODEL_CONFIG = {
  modelId: "klingai:avatar@2.0-standard",
  recordId: "c1d2e3f4-5a6b-0c1d-2e3f-4a5b6c7d8e9f",
  modelName: "KlingAI Avatar 2.0",
  provider: "runware",
  contentType: "lip_sync",
  use_api_key: "RUNWARE_API_KEY_VIDEO",
  baseCreditCost: 25, // Default: 4.5 credits/sec × 5s estimate
  creditPerSecond: 5,
  maxAudioDuration: 60,
  estimatedTimeSeconds: 900,
  costMultipliers: {},
  apiEndpoint: "https://api.runware.ai/v1",
  payloadStructure: "array",
  maxImages: 1,
  requiresAudio: true,
  defaultOutputs: 1,
  taskType: "videoInference",
  outputFormat: "mp4",
  isActive: true,
  logoUrl: "/logos/kling.png",
  modelFamily: "Kling Avatar",
  variantName: "Kling V2 Standard",
  displayOrderInFamily: 1,
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/lip_sync/Runware_KlingAI_Avatar_Standard.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["inputImage", "inputAudio"],
  imageInputField: "inputImage",
  audioInputField: "inputAudio",
  properties: {
    inputImage: {
      type: "string",
      title: "Avatar Image",
      description: "Image URL or UUID of the person/avatar to animate",
      renderer: "image",
    },
    inputAudio: {
      type: "string",
      title: "Audio File",
      description: "Audio URL or UUID for lip-sync (MP3, WAV)",
      renderer: "audio",
    },
    numberResults: {
      type: "integer",
      title: "Number of Videos",
      default: 1,
      minimum: 1,
      maximum: 1,
      showToUser: false,
      description: "How many videos to generate",
    },
  },
  "x-order": ["inputImage", "inputAudio"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.inputImage || (typeof inputs.inputImage === "string" && inputs.inputImage.trim() === "")) {
    return { valid: false, error: "Avatar image is required" };
  }

  if (!inputs.inputAudio || (typeof inputs.inputAudio === "string" && inputs.inputAudio.trim() === "")) {
    return { valid: false, error: "Audio file is required" };
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  return {
    taskType: MODEL_CONFIG.taskType,
    model: MODEL_CONFIG.modelId,
    outputFormat: MODEL_CONFIG.outputFormat,
    numberResults: inputs.numberResults || 1,
    includeCost: true,
    inputs: {
      image: inputs.inputImage, // Map schema field to Runware API format
      audio: inputs.inputAudio, // Map schema field to Runware API format
    },
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(_inputs: Record<string, unknown>, audioDurationSeconds?: number): number {
  const ratePerSecond = MODEL_CONFIG.creditPerSecond;
  // Default to 5 seconds if audio duration not provided
  const duration = audioDurationSeconds || 5;
  // Cap at max audio duration
  const cappedDuration = Math.min(duration, MODEL_CONFIG.maxAudioDuration);
  const numResults = (_inputs.numberResults || 1) as number;
  return Math.round(ratePerSecond * cappedDuration * numResults * 100) / 100;
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const {
    modelParameters,
    userId,
    startPolling,
    uploadedImages,
    uploadImagesToStorage,
    uploadedAudios,
    uploadAudiosToStorage,
    getAudioDuration,
  } = params;

  const inputs: Record<string, unknown> = {
    ...modelParameters,
  };

  // Upload image if provided
  if (uploadedImages && uploadedImages.length > 0 && uploadImagesToStorage) {
    const imageUrls = await uploadImagesToStorage(userId);
    inputs.inputImage = imageUrls[0];
  }

  // Upload audio and get duration
  let audioDuration: number | undefined;
  if (uploadedAudios && uploadedAudios.length > 0 && uploadAudiosToStorage) {
    const audioUrls = await uploadAudiosToStorage(userId);
    inputs.inputAudio = audioUrls[0];
    if (getAudioDuration) {
      audioDuration = await getAudioDuration(uploadedAudios[0]);
    }
  }

  const validation = validate(inputs);
  if (!validation.valid) throw new Error(validation.error);

  // Calculate cost based on actual audio duration
  const cost = calculateCost(inputs, audioDuration);
  await reserveCredits(userId, cost);

  const { data: gen, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: getGenerationType(MODEL_CONFIG.contentType),
      prompt: "Avatar lip-sync generation",
      tokens_used: cost,
      status: GENERATION_STATUS.PENDING,
      settings: sanitizeForStorage(modelParameters),
    })
    .select()
    .single();

  if (error || !gen) throw new Error(`Failed to create generation: ${error?.message}`);

  const { error: funcError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt: "",
      // Pass schema-required fields (inputImage/inputAudio) PLUS API control params needed by Runware provider
      custom_parameters: {
        ...inputs,
        taskType: MODEL_CONFIG.taskType,
        outputFormat: MODEL_CONFIG.outputFormat,
        numberResults: inputs.numberResults || 1,
        includeCost: true,
      },
      preCalculatedCost: cost,
    },
  });

  if (funcError) {
    await supabase.from("generations").update({ status: GENERATION_STATUS.FAILED }).eq("id", gen.id);
    const errorMessage = await extractEdgeFunctionError(funcError);
    throw new Error(errorMessage);
  }

  startPolling(gen.id);
  return gen.id;
}
