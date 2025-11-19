/**
 * LOCKED MODEL FILE - DO NOT EDIT MANUALLY
 * 
 * Model: Google Veo 3.1 HQ
 * Provider: kie_ai
 * Content Type: video
 * Locked By: system
 * Locked At: 2025-01-18
 * 
 * This file is auto-generated and represents a frozen snapshot of the model configuration.
 * Any changes to the model in the database will NOT affect this file.
 * To update this model, unlock it in the admin panel and lock it again.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ============================================================================
// MODEL CONFIGURATION (Frozen at lock time)
// ============================================================================

export const MODEL_CONFIG = {
  id: "veo3",
  recordId: "02060f7f-b514-4110-917d-43fa7af7ccaa",
  modelName: "Google Veo 3.1 HQ",
  provider: "kie_ai",
  contentType: "video",
  baseCost: 125,
  estimatedTimeSeconds: 300,
  apiEndpoint: null,
  payloadStructure: "flat",
} as const;

// ============================================================================
// INPUT SCHEMA (Frozen at lock time)
// ============================================================================

export const SCHEMA = {
  "type": "object",
  "properties": {
    "aspectRatio": {
      "type": "string",
      "title": "Aspect Ratio",
      "enum": [
        "Auto",
        "16:9",
        "9:16"
      ],
      "default": "16:9"
    },
    "endFrame": {
      "type": "string",
      "title": "End Frame (optional)",
      "format": "uri",
      "renderer": "image"
    },
    "generationType": {
      "type": "string",
      "default": "IMAGE_2_VIDEO",
      "showToUser": false
    },
    "model": {
      "type": "string",
      "enum": [
        "veo3",
        "veo3_fast"
      ],
      "default": "veo3",
      "showToUser": false
    },
    "prompt": {
      "type": "string",
      "renderer": "prompt"
    },
    "seeds": {
      "type": "integer",
      "minimum": 10000,
      "maximum": 99999
    },
    "startFrame": {
      "type": "string",
      "title": "Start Frame",
      "format": "uri",
      "renderer": "image"
    }
  },
  "required": [
    "startFrame",
    "prompt"
  ],
  "x-order": [
    "startFrame",
    "endFrame",
    "prompt",
    "model",
    "generationType",
    "aspectRatio",
    "seeds"
  ],
  "usePromptRenderer": true,
  "useImageRenderer": true,
  "useVoiceRenderer": false,
  "useDurationRenderer": false,
  "useIncrementRenderer": false,
  "useOutputFormatRenderer": false,
  "imageInputField": "startFrame"
} as const;

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, any>): Record<string, any> {
  // Transform user inputs into the format required by the provider
  // Based on payload_structure: flat
  
  const payload: Record<string, any> = {
    model: inputs.model || SCHEMA.properties.model.default,
    generationType: inputs.generationType || SCHEMA.properties.generationType.default,
    prompt: inputs.prompt,
    startFrame: inputs.startFrame,
  };

  // Add optional parameters if provided
  if (inputs.endFrame) {
    payload.endFrame = inputs.endFrame;
  }
  
  if (inputs.aspectRatio) {
    payload.aspectRatio = inputs.aspectRatio;
  }
  
  if (inputs.seeds !== undefined && inputs.seeds !== null) {
    payload.seeds = inputs.seeds;
  }

  return payload;
}

// ============================================================================
// COST CALCULATION
// ============================================================================

export function calculateCost(inputs: Record<string, any>): number {
  // Base cost for this model
  let cost = MODEL_CONFIG.baseCost;

  // No cost multipliers defined for this model
  // All generations cost the same base amount

  return Math.round(cost * 100) / 100;
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

export function validate(inputs: Record<string, any>): { valid: boolean; error?: string } {
  // Check required fields
  if (!inputs.prompt || typeof inputs.prompt !== 'string') {
    return { valid: false, error: "Prompt is required" };
  }

  if (!inputs.startFrame || typeof inputs.startFrame !== 'string') {
    return { valid: false, error: "Start frame is required" };
  }

  // Validate startFrame format (should be a URI)
  try {
    new URL(inputs.startFrame);
  } catch {
    return { valid: false, error: "Start frame must be a valid URL" };
  }

  // Validate endFrame format if provided
  if (inputs.endFrame) {
    try {
      new URL(inputs.endFrame);
    } catch {
      return { valid: false, error: "End frame must be a valid URL" };
    }
  }

  // Validate aspectRatio if provided
  if (inputs.aspectRatio && !SCHEMA.properties.aspectRatio.enum?.includes(inputs.aspectRatio)) {
    return { valid: false, error: `Invalid aspect ratio. Must be one of: ${SCHEMA.properties.aspectRatio.enum?.join(', ')}` };
  }

  // Validate model if provided
  if (inputs.model && !SCHEMA.properties.model.enum?.includes(inputs.model)) {
    return { valid: false, error: `Invalid model. Must be one of: ${SCHEMA.properties.model.enum?.join(', ')}` };
  }

  // Validate seeds if provided
  if (inputs.seeds !== undefined && inputs.seeds !== null) {
    const seedsSchema = SCHEMA.properties.seeds;
    if (!Number.isInteger(inputs.seeds)) {
      return { valid: false, error: "Seeds must be an integer" };
    }
    if (inputs.seeds < (seedsSchema.minimum || -Infinity)) {
      return { valid: false, error: `Seeds must be at least ${seedsSchema.minimum}` };
    }
    if (inputs.seeds > (seedsSchema.maximum || Infinity)) {
      return { valid: false, error: `Seeds must be at most ${seedsSchema.maximum}` };
    }
  }

  return { valid: true };
}

// ============================================================================
// EXECUTION ORCHESTRATION
// ============================================================================

export interface ExecuteGenerationParams {
  userId: string;
  inputs: Record<string, any>;
  onProgress?: (status: string) => void;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { userId, inputs, onProgress } = params;

  // Step 1: Validate inputs
  onProgress?.("Validating inputs...");
  const validation = validate(inputs);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Step 2: Calculate cost
  onProgress?.("Calculating cost...");
  const cost = calculateCost(inputs);

  // Step 3: Verify user exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (!profile) {
    throw new Error("User not found");
  }

  // Step 3: Prepare payload
  onProgress?.("Preparing generation request...");
  const payload = preparePayload(inputs);

  // Step 4: Create generation record
  const { data: generation, error: genError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      model_id: MODEL_CONFIG.id,
      model_record_id: MODEL_CONFIG.recordId,
      type: MODEL_CONFIG.contentType,
      prompt: inputs.prompt,
      settings: payload as Json,
      status: "pending",
      tokens_used: cost,
      actual_token_cost: cost,
    })
    .select()
    .single();

  if (genError || !generation) {
    throw new Error("Failed to create generation record");
  }

  // Step 5: Call provider (via edge function)
  onProgress?.("Submitting to provider...");
  const { data: result, error: providerError } = await supabase.functions.invoke(
    "generate-content",
    {
      body: {
        generationId: generation.id,
        modelId: MODEL_CONFIG.id,
        modelRecordId: MODEL_CONFIG.recordId,
        provider: MODEL_CONFIG.provider,
        contentType: MODEL_CONFIG.contentType,
        payload,
      },
    }
  );

  if (providerError) {
    await supabase
      .from("generations")
      .update({ status: "failed" })
      .eq("id", generation.id);
    throw new Error(`Provider error: ${providerError.message}`);
  }

  // Step 6: Poll for completion
  onProgress?.("Processing...");
  let attempts = 0;
  const maxAttempts = 180; // 3 minutes with 1-second intervals
  
  while (attempts < maxAttempts) {
    const { data: gen } = await supabase
      .from("generations")
      .select("status, output_url")
      .eq("id", generation.id)
      .single();

    if (gen?.status === "completed" && gen.output_url) {
      return gen.output_url;
    }

    if (gen?.status === "failed") {
      throw new Error("Generation failed");
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error("Generation timeout");
}
