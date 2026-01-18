/**
 * ElevenLabs Speech-to-Text (Scribe V1)
 * 
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 * 
 * Audio transcription with speaker diarization
 * - Endpoint: /api/v1/jobs/createTask (wrapper structure)
 * - Input: audio_url (max 200MB)
 * - Features: speaker diarization, audio event tagging
 * - Pricing: 1.75 credits per minute
 * 
 * @locked
 * @model elevenlabs/speech-to-text
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
  modelId: "elevenlabs/speech-to-text",
  recordId: "b2c3d4e5-6f0a-1b2c-3d4e-f5a6b7c8d9e0",
  modelName: "ElevenLabs Speech-to-Text",
  provider: "kie_ai",
  contentType: "speech_to_text",
  use_api_key: "KIE_AI_API_KEY_SPEECH_TO_TEXT",
  baseCreditCost: 2, // Minimum ~1 minute
  creditsPerMinute: 1.75,
  estimatedTimeSeconds: 60,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  costMultipliers: null,
  maxImages: 0,
  maxAudios: 1,
  maxFileSize: 200 * 1024 * 1024, // 200MB
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/elevenlabs.png",
  modelFamily: "ElevenLabs",
  variantName: "Speech-to-Text (Scribe)",
  displayOrderInFamily: 5,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/speech_to_text/ElevenLabs_Speech_to_Text.ts",
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
      description: "Audio to transcribe. Formats: MP3, WAV, AAC, MP4, OGG (max 200MB)",
      renderer: "audio",
    },
    language_code: {
      type: "string",
      title: "Language",
      default: "",
      maxLength: 500,
      description: "Language code (e.g., 'en', 'es'). Leave empty for auto-detect.",
      isAdvanced: true,
    },
    diarize: {
      type: "boolean",
      title: "Speaker Diarization",
      default: true,
      description: "Annotate who is speaking in the transcript",
    },
    tag_audio_events: {
      type: "boolean",
      title: "Tag Audio Events",
      default: true,
      description: "Tag events like laughter, applause, music, etc.",
    },
  },
  "x-order": ["audio_url", "diarize", "tag_audio_events"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.audio_url || (typeof inputs.audio_url === "string" && inputs.audio_url.trim() === "")) {
    return { valid: false, error: "Audio file is required" };
  }

  if (inputs.language_code && typeof inputs.language_code === "string" && inputs.language_code.length > 500) {
    return { valid: false, error: "Language code must be 500 characters or less" };
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    audio_url: inputs.audio_url || "",
  };

  if (inputs.language_code) payload.language_code = inputs.language_code;
  if (inputs.diarize !== undefined) payload.diarize = inputs.diarize;
  if (inputs.tag_audio_events !== undefined) payload.tag_audio_events = inputs.tag_audio_events;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(_inputs: Record<string, unknown>, audioDurationMinutes?: number): number {
  // Default estimate if duration unknown
  const duration = audioDurationMinutes || 1;
  const cost = duration * MODEL_CONFIG.creditsPerMinute;
  return Math.max(Math.ceil(cost * 100) / 100, 1); // Minimum 1 credit
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

  const description = "Speech-to-Text Transcription";

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
