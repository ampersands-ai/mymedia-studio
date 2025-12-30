/**
 * Runware Sync Lipsync-2 (Video + Audio to Video)
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * NEW PROVIDER: Runware (Sync via Runware)
 * - External endpoint: https://api.runware.ai/v1
 * - Payload: ARRAY of task objects (unique structure)
 * - Uses taskType: "videoInference"
 * - Uses inputs.video (VIDEO input, not image)
 * - Uses inputs.audio as ARRAY with id and source properties
 * - Uses providerSettings.sync for syncMode and temperature
 * - Lip-sync overlay on existing video
 *
 * @locked
 * @model sync:lipsync-2@1
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
  modelId: "sync:lipsync-2@1",
  recordId: "d2e3f4a5-6b7c-1d2e-3f4a-5b6c7d8e9f0a",
  modelName: "Sync Lipsync-2",
  provider: "runware",
  contentType: "lip_sync",
  use_api_key: "RUNWARE_API_KEY_VIDEO",
  baseCreditCost: 4.0, // 4 credits flat rate (video-to-video)
  estimatedTimeSeconds: 60,
  costMultipliers: {},
  apiEndpoint: "https://api.runware.ai/v1",
  payloadStructure: "array",
  maxImages: null,
  maxVideos: 1,
  requiresAudio: true,
  defaultOutputs: 1,
  taskType: "videoInference",
  isActive: true,
  logoUrl: "/logos/sync.png",
  modelFamily: "Sync",
  variantName: "Lipsync-2",
  displayOrderInFamily: 1,
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/lip_sync/Runware_Sync_Lipsync2.ts",
  // Pricing display - flat rate, not per-second
  isPerSecondPricing: false,
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["inputVideo", "inputAudio"],
  videoField: "inputVideo",
  audioField: "inputAudio",
  properties: {
    inputVideo: {
      type: "string",
      title: "Input Video",
      description: "Video URL or UUID to apply lip sync",
      renderer: "video",
    },
    inputAudio: {
      type: "string",
      title: "Audio File",
      description: "Audio URL or UUID for lip-sync (MP3, WAV)",
      renderer: "audio",
      maxDuration: 60,
    },
    syncMode: {
      type: "string",
      title: "Sync Mode",
      default: "bounce",
      enum: ["bounce", "loop", "freeze"],
      enumLabels: {
        bounce: "Bounce (reverse at end)",
        loop: "Loop (restart at end)",
        freeze: "Freeze (hold last frame)",
      },
      description: "How to handle audio longer than video",
    },
    temperature: {
      type: "number",
      title: "Temperature",
      default: 0.5,
      minimum: 0,
      maximum: 1,
      step: 0.1,
      showToUser: false,
      description: "Controls variation in lip movements (0-1)",
      isAdvanced: true,
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
  "x-order": ["inputVideo", "inputAudio", "syncMode"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.inputVideo || (typeof inputs.inputVideo === "string" && inputs.inputVideo.trim() === "")) {
    return { valid: false, error: "Input video is required" };
  }

  if (!inputs.inputAudio || (typeof inputs.inputAudio === "string" && inputs.inputAudio.trim() === "")) {
    return { valid: false, error: "Audio file is required" };
  }

  const syncMode = inputs.syncMode as string | undefined;
  if (syncMode && !["bounce", "loop", "freeze"].includes(syncMode)) {
    return { valid: false, error: "Sync mode must be bounce, loop, or freeze" };
  }

  const temperature = inputs.temperature as number | undefined;
  if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
    return { valid: false, error: "Temperature must be between 0 and 1" };
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const task: Record<string, unknown> = {
    taskType: MODEL_CONFIG.taskType,
    model: MODEL_CONFIG.modelId,
    numberResults: inputs.numberResults || 1,
    includeCost: true,
    inputs: {
      video: inputs.inputVideo,
      audio: [
        {
          id: "main-audio",
          source: inputs.inputAudio,
        },
      ],
    },
    providerSettings: {
      sync: {
        syncMode: inputs.syncMode || "bounce",
        temperature: inputs.temperature ?? 0.5,
      },
    },
  };

  return task;
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  const base = MODEL_CONFIG.baseCreditCost;
  const numResults = (inputs.numberResults || 1) as number;
  return Math.round(base * numResults * 100) / 100;
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { modelParameters, userId, startPolling } = params;

  const inputs: Record<string, unknown> = {
    ...modelParameters,
  };

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
      prompt: "Video lip-sync generation",
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
      custom_parameters: preparePayload(inputs),
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
