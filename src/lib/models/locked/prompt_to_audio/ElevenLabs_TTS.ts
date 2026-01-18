/**
 * ElevenLabs Text-to-Speech Multilingual V2
 *
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 *
 * High-quality multilingual text-to-speech generation
 * - 21 voice options
 * - Stability, similarity boost, and style controls
 * - Speed adjustment (0.7-1.2)
 * - Context continuity with previous/next text
 * - Note: language_code NOT supported (only Turbo/Flash v2.5)
 *
 * @locked
 * @model elevenlabs/text-to-speech-multilingual-v2
 * @provider primary
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
  modelId: "elevenlabs/text-to-speech-multilingual-v2",
  recordId: "45fc7e71-0174-48eb-998d-547e8d2476db",
  modelName: "ElevenLabs Multilingual V2",
  provider: "kie_ai",
  contentType: "prompt_to_audio",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_AUDIO",
  baseCreditCost: 6, // Per 1000 characters - shown as base in UI
  creditsPerThousandChars: 6,
  minCreditCost: 6, // Minimum cost for any generation
  estimatedTimeSeconds: 30,
  costMultipliers: {},
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/elevenlabs.png",
  modelFamily: "ElevenLabs",
  variantName: "Multilingual V2",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_audio/ElevenLabs_TTS.ts",
} as const;

// ============================================================================
// VOICE OPTIONS
// ============================================================================

const VOICES = [
  "Rachel",
  "Aria",
  "Roger",
  "Sarah",
  "Laura",
  "Charlie",
  "George",
  "Callum",
  "River",
  "Liam",
  "Charlotte",
  "Alice",
  "Matilda",
  "Will",
  "Jessica",
  "Eric",
  "Chris",
  "Brian",
  "Daniel",
  "Lily",
  "Bill",
] as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["text"],
  properties: {
    text: {
      type: "string",
      title: "Text",
      default: "",
      description: "The text to convert to speech",
      maxLength: 5000,
      renderer: "prompt",
    },
    voice: {
      type: "string",
      title: "Voice",
      default: "Brian",
      enum: VOICES,
      enumLabels: Object.fromEntries(VOICES.map((v) => [v, v])),
      description: "The voice to use for speech generation",
      renderer: "voice",
    },
    stability: {
      type: "number",
      title: "Stability",
      default: 0.5,
      minimum: 0,
      maximum: 1,
      step: 0.01,
      isAdvanced: true,
      description: "Voice stability (0-1). Higher = more consistent, lower = more expressive.",
    },
    similarity_boost: {
      type: "number",
      title: "Similarity Boost",
      default: 0.75,
      minimum: 0,
      maximum: 1,
      step: 0.01,
      isAdvanced: true,
      description: "Similarity boost (0-1). Higher = closer to original voice.",
    },
    style: {
      type: "number",
      title: "Style",
      default: 0,
      minimum: 0,
      maximum: 1,
      step: 0.01,
      isAdvanced: true,
      description: "Style exaggeration (0-1). Higher = more expressive style.",
    },
    speed: {
      type: "number",
      title: "Speed",
      default: 1,
      minimum: 0.7,
      maximum: 1.2,
      step: 0.01,
      isAdvanced: true,
      description: "Speech speed (0.7-1.2). Below 1 = slower, above 1 = faster.",
    },
    timestamps: {
      type: "boolean",
      title: "Return Timestamps",
      default: false,
      showToUser: true,
      description: "Whether to return timestamps for each word",
      isAdvanced: true,
    },
    previous_text: {
      type: "string",
      title: "Previous Text",
      default: "",
      maxLength: 5000,
      showToUser: false,
      description: "Text before current request for continuity when concatenating",
      isAdvanced: true,
    },
    next_text: {
      type: "string",
      title: "Next Text",
      default: "",
      showToUser: false,
      maxLength: 5000,
      description: "Text after current request for continuity when concatenating",
      isAdvanced: true,
    },
  },
  "x-order": ["text", "voice", "speed", "stability", "similarity_boost"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.text || (typeof inputs.text === "string" && inputs.text.trim() === "")) {
    return { valid: false, error: "Text is required" };
  }
  if (typeof inputs.text === "string" && inputs.text.length > 5000) {
    return { valid: false, error: "Text must be 5000 characters or less" };
  }

  // Validate numeric ranges
  if (inputs.stability !== undefined) {
    const s = inputs.stability as number;
    if (s < 0 || s > 1) {
      return { valid: false, error: "Stability must be between 0 and 1" };
    }
  }
  if (inputs.similarity_boost !== undefined) {
    const sb = inputs.similarity_boost as number;
    if (sb < 0 || sb > 1) {
      return { valid: false, error: "Similarity boost must be between 0 and 1" };
    }
  }
  if (inputs.style !== undefined) {
    const st = inputs.style as number;
    if (st < 0 || st > 1) {
      return { valid: false, error: "Style must be between 0 and 1" };
    }
  }
  if (inputs.speed !== undefined) {
    const sp = inputs.speed as number;
    if (sp < 0.7 || sp > 1.2) {
      return { valid: false, error: "Speed must be between 0.7 and 1.2" };
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

  if (inputs.voice) payload.voice = inputs.voice;
  if (inputs.stability !== undefined) payload.stability = inputs.stability;
  if (inputs.similarity_boost !== undefined) payload.similarity_boost = inputs.similarity_boost;
  if (inputs.style !== undefined && inputs.style !== 0) payload.style = inputs.style;
  if (inputs.speed !== undefined && inputs.speed !== 1) payload.speed = inputs.speed;
  if (inputs.timestamps !== undefined) payload.timestamps = inputs.timestamps;
  if (inputs.previous_text) payload.previous_text = inputs.previous_text;
  if (inputs.next_text) payload.next_text = inputs.next_text;

  // Note: language_code NOT supported by Multilingual V2

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  // Use 'prompt' as that's what the hook passes, fallback to 'text'
  const text = (inputs.prompt as string) || (inputs.text as string) || '';
  const totalChars = text.length;

  // 6 credits per 1000 characters
  // Minimum 6 credits for any generation (covers up to first 1000 chars)
  if (totalChars === 0) {
    return MODEL_CONFIG.minCreditCost;
  }
  
  const cost = Math.ceil((totalChars / 1000) * MODEL_CONFIG.creditsPerThousandChars);
  return Math.max(cost, MODEL_CONFIG.minCreditCost);
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, startPolling } = params;

  // For TTS, the main input is "text" not "prompt"
  const allInputs: Record<string, unknown> = {
    ...modelParameters,
    text: modelParameters.text || prompt,
  };

  const validation = validate(allInputs);
  if (!validation.valid) {
    throw new Error(validation.error || "Validation failed");
  }

  const cost = calculateCost(allInputs);

  await reserveCredits(userId, cost);

  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      prompt: allInputs.text as string,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: getGenerationType(MODEL_CONFIG.contentType),
      status: GENERATION_STATUS.PROCESSING,
      tokens_used: cost,
      settings: sanitizeForStorage(modelParameters),
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    throw new Error(`Failed to create generation record: ${insertError?.message}`);
  }

  const generationId = generation.id;

  const { error: functionError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: generationId,
      prompt: allInputs.text,
      custom_parameters: preparePayload(allInputs),
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
    },
  });

  if (functionError) {
    throw new Error(`Generation failed: ${functionError.message}`);
  }

  startPolling(generationId);

  return generationId;
}

export default {
  MODEL_CONFIG,
  SCHEMA,
  preparePayload,
  calculateCost,
  validate,
  execute,
};
