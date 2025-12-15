/**
 * Suno Generation V5
 * 
 * LOCKED MODEL FILE - DO NOT MODIFY WITHOUT REVIEW
 * 
 * AI Music Generation with or without lyrics
 * - Endpoint: /api/v1/generate (NOT /api/v1/jobs/createTask)
 * - Payload: FLAT structure
 * - Superior musical expression, faster generation
 * - V5 limits: prompt 5000 chars, style 1000 chars
 * 
 * @locked
 * @model suno/music-v5
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
  modelId: "suno/music-v5",
  recordId: "0e1f2a3b-4c5d-6e7f-8a9b-9c0d1e2f3a4b",
  modelName: "Suno V5",
  provider: "kie_ai",
  contentType: "prompt_to_audio",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_AUDIO",
  baseCreditCost: 20,
  estimatedTimeSeconds: 90,
  costMultipliers: {},
  apiEndpoint: "/api/v1/generate",
  payloadStructure: "flat",
  maxImages: 0,
  defaultOutputs: 2,
  // V5 specific limits
  maxPromptLength: 5000,
  maxStyleLength: 1000,
  maxTitleLength: 80,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/suno.png",
  modelFamily: "Suno",
  variantName: "V5 (Latest)",
  displayOrderInFamily: 5,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_audio/Suno_V5.ts",
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

export const SCHEMA = Object.freeze({
  type: "object",
  required: ["prompt", "customMode", "instrumental"],
  properties: {
    prompt: {
      type: "string",
      title: "Prompt / Lyrics",
      default: "",
      description: "In Custom Mode with vocals: used as exact lyrics. In Non-custom Mode: idea for auto-generated lyrics. Max 5000 chars (Custom) or 500 chars (Non-custom).",
      maxLength: 5000,
      renderer: "textarea",
    },
    customMode: {
      type: "boolean",
      title: "Custom Mode",
      default: false,
      description: "Enable detailed control with style and title fields. Disable for simplified mode.",
    },
    instrumental: {
      type: "boolean",
      title: "Instrumental",
      default: false,
      description: "Generate music without vocals/lyrics.",
    },
    style: {
      type: "string",
      title: "Style",
      default: "",
      maxLength: 1000,
      description: "Music style (e.g., Jazz, Classical, Pop). Required in Custom Mode. Max 1000 chars.",
    },
    title: {
      type: "string",
      title: "Title",
      default: "",
      maxLength: 80,
      description: "Track title. Required in Custom Mode. Max 80 chars.",
    },
    negativeTags: {
      type: "string",
      title: "Negative Tags",
      default: "",
      description: "Styles to exclude (e.g., 'Heavy Metal, Upbeat Drums')",
      isAdvanced: true,
    },
    vocalGender: {
      type: "string",
      title: "Vocal Gender",
      default: "",
      enum: ["", "m", "f"],
      enumLabels: {
        "": "Auto",
        m: "Male",
        f: "Female",
      },
      description: "Vocal gender preference. Only effective in Custom Mode. Not guaranteed.",
      isAdvanced: true,
    },
    styleWeight: {
      type: "number",
      title: "Style Weight",
      default: 0.5,
      minimum: 0,
      maximum: 1,
      step: 0.01,
      description: "Strength of style adherence (0-1)",
      isAdvanced: true,
    },
    weirdnessConstraint: {
      type: "number",
      title: "Weirdness",
      default: 0.5,
      minimum: 0,
      maximum: 1,
      step: 0.01,
      description: "Creative deviation level (0-1)",
      isAdvanced: true,
    },
    audioWeight: {
      type: "number",
      title: "Audio Weight",
      default: 0.5,
      minimum: 0,
      maximum: 1,
      step: 0.01,
      description: "Balance weight for audio features (0-1)",
      isAdvanced: true,
    },
    personaId: {
      type: "string",
      title: "Persona ID",
      default: "",
      description: "Apply a specific persona style. Only in Custom Mode.",
      isAdvanced: true,
    },
  },
  "x-order": ["prompt", "customMode", "instrumental", "style", "title"],
});

// ============================================================================
// VALIDATION - COMPLEX MODE-BASED RULES
// ============================================================================

export function validate(inputs: Record<string, unknown>): { valid: boolean; error?: string } {
  const customMode = inputs.customMode === true;
  // instrumental is used in preparePayload, not validation

  // Prompt is always required
  if (!inputs.prompt || (typeof inputs.prompt === "string" && inputs.prompt.trim() === "")) {
    return { valid: false, error: "Prompt is required" };
  }

  const prompt = inputs.prompt as string;

  // Validate prompt length based on mode
  if (customMode) {
    if (prompt.length > 5000) {
      return { valid: false, error: "Prompt must be 5000 characters or less in Custom Mode (V5)" };
    }
  } else {
    if (prompt.length > 500) {
      return { valid: false, error: "Prompt must be 500 characters or less in Non-custom Mode" };
    }
  }

  // Custom Mode validations
  if (customMode) {
    // Style is always required in Custom Mode
    if (!inputs.style || (typeof inputs.style === "string" && inputs.style.trim() === "")) {
      return { valid: false, error: "Style is required in Custom Mode" };
    }
    if (typeof inputs.style === "string" && inputs.style.length > 1000) {
      return { valid: false, error: "Style must be 1000 characters or less (V5)" };
    }

    // Title is always required in Custom Mode
    if (!inputs.title || (typeof inputs.title === "string" && inputs.title.trim() === "")) {
      return { valid: false, error: "Title is required in Custom Mode" };
    }
    if (typeof inputs.title === "string" && inputs.title.length > 80) {
      return { valid: false, error: "Title must be 80 characters or less" };
    }
  }

  // Validate numeric ranges
  if (inputs.styleWeight !== undefined) {
    const sw = inputs.styleWeight as number;
    if (sw < 0 || sw > 1) {
      return { valid: false, error: "Style weight must be between 0 and 1" };
    }
  }
  if (inputs.weirdnessConstraint !== undefined) {
    const wc = inputs.weirdnessConstraint as number;
    if (wc < 0 || wc > 1) {
      return { valid: false, error: "Weirdness constraint must be between 0 and 1" };
    }
  }
  if (inputs.audioWeight !== undefined) {
    const aw = inputs.audioWeight as number;
    if (aw < 0 || aw > 1) {
      return { valid: false, error: "Audio weight must be between 0 and 1" };
    }
  }

  return { valid: true };
}

// ============================================================================
// PAYLOAD PREPARATION - FLAT STRUCTURE
// ============================================================================

export function preparePayload(inputs: Record<string, unknown>): Record<string, unknown> {
  const customMode = inputs.customMode === true;

  const payload: Record<string, unknown> = {
    prompt: inputs.prompt || "",
    customMode: customMode,
    instrumental: inputs.instrumental === true,
    model: "V5", // V5 model version
  };

  // Custom Mode fields
  if (customMode) {
    if (inputs.style) payload.style = inputs.style;
    if (inputs.title) payload.title = inputs.title;
    if (inputs.vocalGender && inputs.vocalGender !== "") payload.vocalGender = inputs.vocalGender;
    if (inputs.personaId) payload.personaId = inputs.personaId;
  }

  // Optional fields (both modes)
  if (inputs.negativeTags) payload.negativeTags = inputs.negativeTags;
  if (inputs.styleWeight !== undefined && inputs.styleWeight !== 0.5) {
    payload.styleWeight = inputs.styleWeight;
  }
  if (inputs.weirdnessConstraint !== undefined && inputs.weirdnessConstraint !== 0.5) {
    payload.weirdnessConstraint = inputs.weirdnessConstraint;
  }
  if (inputs.audioWeight !== undefined && inputs.audioWeight !== 0.5) {
    payload.audioWeight = inputs.audioWeight;
  }

  return payload;
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(_inputs: Record<string, unknown>): number {
  return MODEL_CONFIG.baseCreditCost;
}

// ============================================================================
// EXECUTION
// ============================================================================

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, prompt, modelParameters, startPolling } = params;

  const allInputs: Record<string, unknown> = {
    ...modelParameters,
    prompt: modelParameters.prompt || prompt,
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
      prompt: allInputs.prompt as string,
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
      generation_id: generationId,
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      prompt: allInputs.prompt,
      custom_parameters: preparePayload(allInputs),
      cost: cost,
      use_api_key: MODEL_CONFIG.use_api_key,
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
