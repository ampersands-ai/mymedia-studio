/**
 * ElevenLabs Audio Isolation
 * 
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 * 
 * Remove background noise and isolate speech
 * - Endpoint: /api/v1/jobs/createTask (wrapper structure)
 * - Input: audio_url (max 10MB)
 * - Removes music, noise, interference while preserving speech
 * - Pricing: 0.1 credits per second
 * 
 * @locked
 * @model elevenlabs/audio-isolation
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
  modelId: "elevenlabs/audio-isolation",
  recordId: "c3d4e5f6-0a1b-2c3d-4e5f-a6b7c8d9e0f1",
  modelName: "ElevenLabs Audio Isolation",
  provider: "kie_ai",
  contentType: "audio_to_audio",
  use_api_key: "KIE_AI_API_KEY_AUDIO_TO_AUDIO",
  baseCreditCost: 1, // Minimum
  creditsPerSecond: 0.1,
  estimatedTimeSeconds: 30,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  costMultipliers: null,
  maxImages: 0,
  maxAudios: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/elevenlabs.png",
  modelFamily: "ElevenLabs",
  variantName: "Audio Isolation",
  displayOrderInFamily: 6,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/audio_to_audio/ElevenLabs_Audio_Isolation.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["audio_url"],
  audioInputField: "audio_url",
  properties: {
    audio_url: {
      type: "string",
      format: "uri",
      title: "Audio File",
      description: "Audio to isolate speech from. Formats: MP3, WAV, AAC, MP4, OGG (max 10MB)",
      renderer: "audio",
    },
  },
  "x-order": ["audio_url"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.audio_url || (typeof inputs.audio_url === "string" && inputs.audio_url.trim() === "")) {
    return { valid: false, error: "Audio file is required" };
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
      audio_url: inputs.audio_url || "",
    },
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(_inputs: Record<string, unknown>, audioDurationSeconds?: number): number {
  // Default estimate if duration unknown (30 seconds)
  const duration = audioDurationSeconds || 30;
  const cost = duration * MODEL_CONFIG.creditsPerSecond;
  return Math.max(Math.ceil(cost * 10) / 10, 1); // Minimum 1 credit, round to 1 decimal
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, modelParameters, uploadedAudios, uploadAudiosToStorage, startPolling } = params;

  const allInputs: Record<string, unknown> = { ...modelParameters };

  // Upload audio
  if (uploadedAudios && uploadedAudios.length > 0 && uploadAudiosToStorage) {
    const audioUrls = await uploadAudiosToStorage(userId);
    allInputs.audio_url = audioUrls[0];
  }

  const validation = validate(allInputs);
  if (!validation.valid) throw new Error(validation.error || "Validation failed");

  // TODO: Get actual audio duration for accurate cost calculation
  const cost = calculateCost(allInputs);
  await reserveCredits(userId, cost);

  const description = "Audio Isolation";

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
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      prompt: description,
      custom_parameters: preparePayload(allInputs),
      preCalculatedCost: cost, // Correct field name for edge function
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
