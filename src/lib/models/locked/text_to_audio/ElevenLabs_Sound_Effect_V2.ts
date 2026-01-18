/**
 * ElevenLabs Sound Effect V2
 * 
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 * 
 * Text-to-sound effect generation
 * - Endpoint: /api/v1/jobs/createTask (wrapper structure)
 * - Supports 20+ second clips, seamless looping, 48kHz audio
 * - Duration: 0.5-22 seconds
 * - Pricing: 0.125 credits per second
 * 
 * @locked
 * @model elevenlabs/sound-effect-v2
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
  modelId: "elevenlabs/sound-effect-v2",
  recordId: "a1b2c3d4-5e6f-0a1b-2c3d-e4f5a6b7c8d9",
  modelName: "ElevenLabs Sound Effect V2",
  provider: "kie_ai",
  contentType: "text_to_audio",
  use_api_key: "KIE_AI_API_KEY_TEXT_TO_AUDIO",
  baseCreditCost: 1, // Minimum
  creditsPerSecond: 0.125,
  minDuration: 0.5,
  maxDuration: 22,
  estimatedTimeSeconds: 15,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  costMultipliers: null,
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/elevenlabs.png",
  modelFamily: "ElevenLabs",
  variantName: "Sound Effect V2",
  displayOrderInFamily: 4,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/text_to_audio/ElevenLabs_Sound_Effect_V2.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["text"],
  properties: {
    text: {
      type: "string",
      title: "Description",
      default: "",
      description: "Describe the sound effect to generate",
      maxLength: 450,
      renderer: "prompt",
    },
    duration_seconds: {
      type: "number",
      title: "Duration (seconds)",
      default: 5,
      minimum: 0.5,
      maximum: 22,
      step: 0.1,
      description: "Duration in seconds. Leave empty for auto-optimal duration.",
    },
    loop: {
      type: "boolean",
      title: "Seamless Loop",
      default: false,
      description: "Create a sound effect that loops smoothly",
    },
    prompt_influence: {
      type: "number",
      title: "Prompt Influence",
      default: 0.3,
      minimum: 0,
      maximum: 1,
      step: 0.01,
      description: "How closely to follow the prompt (0-1). Higher = less variation.",
      isAdvanced: true,
    },
    output_format: {
      type: "string",
      title: "Output Format",
      default: "mp3_44100_128",
      enum: [
        "mp3_22050_32", "mp3_44100_32", "mp3_44100_64", "mp3_44100_96",
        "mp3_44100_128", "mp3_44100_192",
        "pcm_8000", "pcm_16000", "pcm_22050", "pcm_24000", "pcm_44100", "pcm_48000",
        "ulaw_8000", "alaw_8000",
        "opus_48000_32", "opus_48000_64", "opus_48000_96", "opus_48000_128", "opus_48000_192"
      ],
      enumLabels: {
        "mp3_22050_32": "MP3 22kHz 32kbps",
        "mp3_44100_32": "MP3 44kHz 32kbps",
        "mp3_44100_64": "MP3 44kHz 64kbps",
        "mp3_44100_96": "MP3 44kHz 96kbps",
        "mp3_44100_128": "MP3 44kHz 128kbps",
        "mp3_44100_192": "MP3 44kHz 192kbps",
        "pcm_8000": "PCM 8kHz",
        "pcm_16000": "PCM 16kHz",
        "pcm_22050": "PCM 22kHz",
        "pcm_24000": "PCM 24kHz",
        "pcm_44100": "PCM 44kHz",
        "pcm_48000": "PCM 48kHz (Studio)",
        "ulaw_8000": "μ-law 8kHz",
        "alaw_8000": "A-law 8kHz",
        "opus_48000_32": "Opus 48kHz 32kbps",
        "opus_48000_64": "Opus 48kHz 64kbps",
        "opus_48000_96": "Opus 48kHz 96kbps",
        "opus_48000_128": "Opus 48kHz 128kbps",
        "opus_48000_192": "Opus 48kHz 192kbps",
      },
      description: "Audio output format",
      isAdvanced: true,
    },
  },
  "x-order": ["text", "duration_seconds", "loop"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.text || (typeof inputs.text === "string" && inputs.text.trim() === "")) {
    return { valid: false, error: "Sound effect description is required" };
  }
  if (typeof inputs.text === "string" && inputs.text.length > 450) {
    return { valid: false, error: "Description must be 450 characters or less" };
  }

  if (inputs.duration_seconds !== undefined) {
    const duration = inputs.duration_seconds as number;
    if (duration < 0.5 || duration > 22) {
      return { valid: false, error: "Duration must be between 0.5 and 22 seconds" };
    }
  }

  if (inputs.prompt_influence !== undefined) {
    const influence = inputs.prompt_influence as number;
    if (influence < 0 || influence > 1) {
      return { valid: false, error: "Prompt influence must be between 0 and 1" };
    }
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    text: inputs.text || "",
  };

  if (inputs.duration_seconds !== undefined) payload.duration_seconds = inputs.duration_seconds;
  if (inputs.loop !== undefined) payload.loop = inputs.loop;
  if (inputs.prompt_influence !== undefined) payload.prompt_influence = inputs.prompt_influence;
  if (inputs.output_format) payload.output_format = inputs.output_format;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  const duration = (inputs.duration_seconds as number) || 5; // Default 5 seconds
  const cost = duration * MODEL_CONFIG.creditsPerSecond;
  return Math.max(Math.ceil(cost * 100) / 100, 1); // Minimum 1 credit
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, startPolling } = params;

  const allInputs: Record<string, unknown> = {
    ...modelParameters,
    text: modelParameters.text || prompt,
  };

  const validation = validate(allInputs);
  if (!validation.valid) throw new Error(validation.error || "Validation failed");

  const cost = calculateCost(allInputs);
  await reserveCredits(userId, cost);

  const description = (allInputs.text as string).substring(0, 100);

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
