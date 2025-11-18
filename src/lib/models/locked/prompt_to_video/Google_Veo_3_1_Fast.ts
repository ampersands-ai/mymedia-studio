/**
 * LOCKED MODEL FILE - DO NOT EDIT MANUALLY
 * 
 * Model: Google Veo 3.1 Fast
 * Provider: google
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
  id: "c7c25e05-8959-4c8f-94bf-7fa866b21f4e",
  recordId: "google-veo-3-1-fast",
  modelName: "Google Veo 3.1 Fast",
  provider: "google",
  contentType: "video",
  baseCost: 1,
  estimatedTimeSeconds: 60,
  apiEndpoint: null,
  payloadStructure: "google_imagegeneration",
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
      "description": "The aspect ratio for the generated video",
      "enum": [
        "9:16",
        "16:9",
        "1:1"
      ],
      "default": "9:16"
    },
    "generationType": {
      "type": "string",
      "title": "Generation Type",
      "description": "The type of video generation",
      "enum": [
        "IMAGE_TO_VIDEO",
        "TEXT_TO_VIDEO"
      ],
      "default": "TEXT_TO_VIDEO"
    },
    "model": {
      "type": "string",
      "title": "Model",
      "description": "The model to use for generation",
      "enum": [
        "veo-3.1-fast-2b"
      ],
      "default": "veo-3.1-fast-2b"
    },
    "prompt": {
      "type": "string",
      "title": "Prompt",
      "description": "Text prompt describing the video to generate",
      "minLength": 1,
      "maxLength": 1000,
      "renderer": "prompt"
    },
    "seeds": {
      "type": "array",
      "title": "Seeds",
      "description": "Random seeds for reproducibility",
      "items": {
        "type": "integer"
      },
      "default": []
    }
  },
  "required": [
    "prompt"
  ],
  "x-order": [
    "prompt",
    "aspectRatio",
    "generationType",
    "model",
    "seeds"
  ],
  "usePromptRenderer": true,
  "useImageRenderer": false,
  "useVoiceRenderer": false,
  "useDurationRenderer": false,
  "useIncrementRenderer": false,
  "useOutputFormatRenderer": false,
  "imageInputField": null
} as const;

// ============================================================================
// PAYLOAD PREPARATION
// ============================================================================

export function preparePayload(inputs: Record<string, any>): Record<string, any> {
  // Transform user inputs into the format required by the provider
  // Based on payload_structure: google_imagegeneration
  
  const payload: Record<string, any> = {
    model: inputs.model || SCHEMA.properties.model.default,
    generationType: inputs.generationType || SCHEMA.properties.generationType.default,
    prompt: inputs.prompt,
  };

  // Add optional parameters if provided
  if (inputs.aspectRatio) {
    payload.aspectRatio = inputs.aspectRatio;
  }
  
  if (inputs.seeds && Array.isArray(inputs.seeds) && inputs.seeds.length > 0) {
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

  // Validate prompt length
  const promptSchema = SCHEMA.properties.prompt;
  if (inputs.prompt.length < (promptSchema.minLength || 0)) {
    return { valid: false, error: `Prompt must be at least ${promptSchema.minLength} characters` };
  }
  if (inputs.prompt.length > (promptSchema.maxLength || Infinity)) {
    return { valid: false, error: `Prompt must be at most ${promptSchema.maxLength} characters` };
  }

  // Validate aspectRatio if provided
  if (inputs.aspectRatio && !SCHEMA.properties.aspectRatio.enum?.includes(inputs.aspectRatio)) {
    return { valid: false, error: `Invalid aspect ratio. Must be one of: ${SCHEMA.properties.aspectRatio.enum?.join(', ')}` };
  }

  // Validate generationType if provided
  if (inputs.generationType && !SCHEMA.properties.generationType.enum?.includes(inputs.generationType)) {
    return { valid: false, error: `Invalid generation type. Must be one of: ${SCHEMA.properties.generationType.enum?.join(', ')}` };
  }

  // Validate model if provided
  if (inputs.model && !SCHEMA.properties.model.enum?.includes(inputs.model)) {
    return { valid: false, error: `Invalid model. Must be one of: ${SCHEMA.properties.model.enum?.join(', ')}` };
  }

  // Validate seeds if provided
  if (inputs.seeds !== undefined) {
    if (!Array.isArray(inputs.seeds)) {
      return { valid: false, error: "Seeds must be an array of integers" };
    }
    if (!inputs.seeds.every((seed: any) => Number.isInteger(seed))) {
      return { valid: false, error: "All seeds must be integers" };
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
  const maxAttempts = 120; // 2 minutes with 1-second intervals
  
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
