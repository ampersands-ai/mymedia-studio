/** Sora 2 Pro Storyboard (prompt_to_video) - Record: a9b3c4d5-0e1f-2a3b-4c5d-6e7f8a9b0c1d */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Sora 2 Pro Storyboard - Multi-scene video generation
 * Uses `shots` array to define sequence of scenes with durations
 * Total duration = sum of shot durations, must match n_frames
 */
export const MODEL_CONFIG = {
  modelId: "sora-2-pro-storyboard",
  recordId: "a9b3c4d5-0e1f-2a3b-4c5d-6e7f8a9b0c1d",
  modelName: "Sora 2 Pro Storyboard",
  provider: "kie_ai",
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
  baseCreditCost: 75,
  estimatedTimeSeconds: 1000,
  costMultipliers: {
    n_frames: { "10": 1, "15": 1.8, "25": 2 },
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 1,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/sora.png",
  modelFamily: "Sora",
  variantName: "Sora 2 Pro Storyboard",
  displayOrderInFamily: 1,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Sora_2_Pro_Storyboard.ts",
} as const;

export const SCHEMA = {
  imageInputField: "image_urls",
  properties: {
    shots: {
      type: "array",
      title: "Storyboard Shots",
      description: "Array of scene objects with duration and description",
      items: {
        type: "object",
        properties: {
          Scene: { type: "string", description: "Scene description/prompt" },
          duration: { type: "number", description: "Duration in seconds" },
        },
        required: ["Scene", "duration"],
      },
      minItems: 1,
    },
    n_frames: {
      default: "15",
      enum: ["10", "15", "25"],
      enumLabels: {
        "10": "10 seconds",
        "15": "15 seconds",
        "25": "25 seconds",
      },
      type: "string",
      title: "Total Duration",
    },
    aspect_ratio: {
      default: "landscape",
      enum: ["portrait", "landscape"],
      enumLabels: {
        portrait: "Portrait",
        landscape: "Landscape",
      },
      type: "string",
    },
    image_urls: {
      type: "array",
      title: "Reference Image (Optional)",
      description:
        "Image to use as the first frame. Formats: jpeg, png, webp (max 10MB). We currently do not support uploads of images containing photorealistic people (AI generated).",
      renderer: "image",
      items: { type: "string", format: "uri" },
      maxItems: 1,
    },
  },
  required: ["shots", "n_frames"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.shots || !Array.isArray(inputs.shots) || inputs.shots.length === 0) {
    return { valid: false, error: "At least one shot is required" };
  }

  // Validate each shot
  for (let i = 0; i < inputs.shots.length; i++) {
    const shot = inputs.shots[i];
    if (!shot.Scene || typeof shot.Scene !== "string") {
      return { valid: false, error: `Shot ${i + 1}: Scene description required` };
    }
    if (shot.duration === undefined || typeof shot.duration !== "number" || shot.duration <= 0) {
      return { valid: false, error: `Shot ${i + 1}: Valid duration required` };
    }
  }

  // Validate total duration matches n_frames
  const totalDuration = inputs.shots.reduce((sum: number, shot: any) => sum + shot.duration, 0);
  const targetDuration = parseInt(inputs.n_frames || "15");
  if (Math.abs(totalDuration - targetDuration) > 0.5) {
    return {
      valid: false,
      error: `Total shot durations (${totalDuration}s) must equal selected duration (${targetDuration}s)`,
    };
  }

  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    shots: inputs.shots,
    n_frames: inputs.n_frames || "15",
  };

  if (inputs.aspect_ratio) payload.aspect_ratio = inputs.aspect_ratio;
  if (inputs.image_urls && inputs.image_urls.length > 0) payload.image_urls = inputs.image_urls;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const base = MODEL_CONFIG.baseCreditCost;
  const framesKey = (inputs.n_frames || "15") as keyof typeof MODEL_CONFIG.costMultipliers.n_frames;
  const framesMult = MODEL_CONFIG.costMultipliers.n_frames[framesKey] || 1;
  return Math.round(base * framesMult * 100) / 100;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { modelParameters, uploadedImages, userId, uploadImagesToStorage, startPolling } = params;
  const inputs: Record<string, any> = { ...modelParameters };

  // Upload reference image if provided
  if (uploadedImages.length > 0) {
    inputs.image_urls = await uploadImagesToStorage(userId);
  }

  const validation = validate(inputs);
  if (!validation.valid) throw new Error(validation.error);
  const cost = calculateCost(inputs);
  await reserveCredits(userId, cost);

  // Create prompt from shots for storage
  const promptText = inputs.shots.map((s: any) => s.Scene).join(" | ");

  const { data: gen, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      model_id: MODEL_CONFIG.modelId,
      model_record_id: MODEL_CONFIG.recordId,
      type: getGenerationType(MODEL_CONFIG.contentType),
      prompt: promptText,
      tokens_used: cost,
      status: GENERATION_STATUS.PENDING,
      settings: sanitizeForStorage(modelParameters),
    })
    .select()
    .single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call edge function to handle API call server-side
  const { error: funcError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt: promptText,
      custom_parameters: preparePayload(inputs),
    },
  });

  if (funcError) {
    await supabase.from("generations").update({ status: GENERATION_STATUS.FAILED }).eq("id", gen.id);
    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  startPolling(gen.id);
  return gen.id;
}
