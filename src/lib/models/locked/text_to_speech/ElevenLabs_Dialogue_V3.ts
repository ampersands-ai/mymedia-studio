/**
 * ElevenLabs Text-to-Dialogue V3
 * 
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 * 
 * Multi-voice dialogue generation with emotions
 * - Endpoint: /api/v1/jobs/createTask (wrapper structure)
 * - Input: Array of dialogue objects (text + voice)
 * - 20 available voices
 * - Supports emotion tags: [excitedly], [whispering], [curiously], etc.
 * - Pricing: 7 credits per 1,000 characters
 * - Max total text: 5000 characters
 * 
 * @locked
 * @model elevenlabs/text-to-dialogue-v3
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
  modelId: "elevenlabs/text-to-dialogue-v3",
  recordId: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d", // Valid hex UUID
  modelName: "ElevenLabs Dialogue V3",
  provider: "kie_ai",
  contentType: "prompt_to_audio",
  use_api_key: "KIE_AI_API_KEY_TEXT_TO_SPEECH",
  baseCreditCost: 7, // Per 1000 characters - shown as base in UI
  creditsPerThousandChars: 7,
  minCreditCost: 7, // Minimum cost for any generation
  maxTotalCharacters: 5000,
  estimatedTimeSeconds: 30,
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  costMultipliers: {},
  // Available voices
  voices: [
    "Adam", "Alice", "Bill", "Brian", "Callum", "Charlie", "Chris", "Daniel",
    "Eric", "George", "Harry", "Jessica", "Laura", "Liam", "Lily", "Matilda",
    "River", "Roger", "Sarah", "Will"
  ],
  // UI metadata
  isActive: true,
  logoUrl: "/logos/elevenlabs.png",
  modelFamily: "ElevenLabs",
  variantName: "Dialogue V3",
  displayOrderInFamily: 3,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/text_to_speech/ElevenLabs_Dialogue_V3.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["dialogue"],
  properties: {
    dialogue: {
      type: "array",
      title: "Dialogue",
      description: "Array of dialogue entries. Use emotion tags like [excitedly], [whispering], [curiously]. Total text max 5000 characters.",
      minItems: 1,
      items: {
        type: "object",
        required: ["text", "voice"],
        properties: {
          text: {
            type: "string",
            title: "Text",
            maxLength: 5000,
            description: "Dialogue text content. Supports emotion tags.",
          },
          voice: {
            type: "string",
            title: "Voice",
            enum: [
              "Adam", "Alice", "Bill", "Brian", "Callum", "Charlie", "Chris", "Daniel",
              "Eric", "George", "Harry", "Jessica", "Laura", "Liam", "Lily", "Matilda",
              "River", "Roger", "Sarah", "Will"
            ],
            description: "Voice character for this line",
          },
        },
      },
      renderer: "dialogue",
    },
    stability: {
      type: "number",
      title: "Stability",
      default: 0.5,
      minimum: 0,
      maximum: 1,
      step: 0.1,
      description: "Voice stability. Higher = more consistent, lower = more expressive.",
      isAdvanced: true,
    },
    language_code: {
      type: "string",
      title: "Language",
      default: "auto",
      enum: [
        "auto", "af", "ar", "hy", "as", "az", "be", "bn", "bs", "bg", "ca", "ceb", "ny",
        "hr", "cs", "da", "nl", "en", "et", "fil", "fi", "fr", "gl", "ka", "de", "el",
        "gu", "ha", "he", "hi", "hu", "is", "id", "ga", "it", "ja", "jv", "kn", "kk",
        "ky", "ko", "lv", "ln", "lt", "lb", "mk", "ms", "ml", "zh", "mr", "ne", "no",
        "ps", "fa", "pl", "pt", "pa", "ro", "ru", "sr", "sd", "sk", "sl", "so", "es",
        "sw", "sv", "ta", "te", "th", "tr", "uk", "ur", "vi", "cy"
      ],
      enumLabels: {
        auto: "Auto Detect",
        en: "English",
        es: "Spanish",
        fr: "French",
        de: "German",
        it: "Italian",
        pt: "Portuguese",
        zh: "Mandarin Chinese",
        ja: "Japanese",
        ko: "Korean",
        ar: "Arabic",
        hi: "Hindi",
        ru: "Russian",
        nl: "Dutch",
        pl: "Polish",
        tr: "Turkish",
        sv: "Swedish",
        da: "Danish",
        no: "Norwegian",
        fi: "Finnish",
      },
      description: "Language for speech synthesis",
      isAdvanced: true,
    },
  },
  "x-order": ["dialogue", "stability", "language_code"],
});

// ============================================================================
// VALIDATION
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!inputs.dialogue || !Array.isArray(inputs.dialogue) || inputs.dialogue.length === 0) {
    return { valid: false, error: "At least one dialogue entry is required" };
  }

  const dialogue = inputs.dialogue as Array<{ text?: string; voice?: string }>;
  let totalChars = 0;

  for (let i = 0; i < dialogue.length; i++) {
    const entry = dialogue[i];
    
    if (!entry.text || entry.text.trim() === "") {
      return { valid: false, error: `Dialogue entry ${i + 1}: Text is required` };
    }
    
    if (!entry.voice) {
      return { valid: false, error: `Dialogue entry ${i + 1}: Voice is required` };
    }
    
    const voices = MODEL_CONFIG.voices as readonly string[];
    if (!voices.includes(entry.voice)) {
      return { valid: false, error: `Dialogue entry ${i + 1}: Invalid voice "${entry.voice}"` };
    }
    
    totalChars += entry.text.length;
  }

  if (totalChars > MODEL_CONFIG.maxTotalCharacters) {
    return { valid: false, error: `Total text length (${totalChars}) exceeds maximum of ${MODEL_CONFIG.maxTotalCharacters} characters` };
  }

  if (inputs.stability !== undefined) {
    const stability = inputs.stability as number;
    if (stability < 0 || stability > 1) {
      return { valid: false, error: "Stability must be between 0 and 1" };
    }
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    dialogue: inputs.dialogue || [],
  };

  if (inputs.stability !== undefined) payload.stability = inputs.stability;
  if (inputs.language_code) payload.language_code = inputs.language_code;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, unknown>): number {
  const dialogue = inputs.dialogue as Array<{ text: string }> || [];
  
  let totalChars = 0;
  for (const entry of dialogue) {
    if (entry.text) {
      totalChars += entry.text.length;
    }
  }

  // 7 credits per 1000 characters
  // Minimum 7 credits for any generation (covers up to first 1000 chars)
  if (totalChars === 0) {
    return MODEL_CONFIG.minCreditCost; // Show 7 when no text entered
  }
  
  const cost = Math.ceil((totalChars / 1000) * MODEL_CONFIG.creditsPerThousandChars);
  return Math.max(cost, MODEL_CONFIG.minCreditCost);
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, modelParameters, startPolling } = params;

  const allInputs: Record<string, unknown> = { ...modelParameters };

  const validation = validate(allInputs);
  if (!validation.valid) throw new Error(validation.error || "Validation failed");

  const cost = calculateCost(allInputs);
  await reserveCredits(userId, cost);

  // Generate description from first dialogue entry
  const dialogue = allInputs.dialogue as Array<{ text: string; voice: string }>;
  const description = dialogue.length > 0 
    ? `${dialogue[0].voice}: "${dialogue[0].text.substring(0, 50)}${dialogue[0].text.length > 50 ? '...' : ''}"`
    : "Dialogue generation";

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

  const generationId = generation.id;

  const { error: functionError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: generationId,
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

  startPolling(generationId);
  return generationId;
}

export default { MODEL_CONFIG, SCHEMA, preparePayload, calculateCost, validate, execute };
