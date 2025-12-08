/** Seedance V1 Lite Text-to-Video (prompt_to_video) - Record: e8d7c6b5-7e4f-3c2d-8a1f-5d7b8c9e4a6f */
import { getGenerationType } from "@/lib/models/registry";
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";

/**
 * Seedance V1 Lite Text-to-Video
 * - CORRECTED modelId: bytedance/v1-lite-text-to-video (not seedance/v1-lite)
 * - Resolution: 480p, 720p, 1080p
 * - Duration: 5s or 10s
 * - Extended aspect ratios including 9:21
 */
export const MODEL_CONFIG = {
  modelId: "bytedance/v1-lite-text-to-video", // CORRECTED!
  recordId: "e8d7c6b5-7e4f-3c2d-8a1f-5d7b8c9e4a6f",
  modelName: "Seedance V1 Lite",
  provider: "kie_ai",
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
  baseCreditCost: 8,
  estimatedTimeSeconds: 90,
  costMultipliers: {
    duration: { "5": 1, "10": 2 },
    resolution: { "480p": 0.5, "720p": 1, "1080p": 2 },
  },
  apiEndpoint: "/api/v1/jobs/createTask",
  payloadStructure: "wrapper",
  maxImages: 0,
  defaultOutputs: 1,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/seedance.png",
  modelFamily: "Seedance",
  variantName: "Seedance V1 Lite",
  displayOrderInFamily: 3,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Seedance_V1_Lite_T2V.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: {
      maxLength: 10000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt to guide video generation",
    },
    aspect_ratio: {
      default: "16:9",
      enum: ["16:9", "4:3", "1:1", "3:4", "9:16", "9:21"],
      enumLabels: {
        "16:9": "Landscape (16:9)",
        "4:3": "Standard (4:3)",
        "1:1": "Square (1:1)",
        "3:4": "Portrait (3:4)",
        "9:16": "Vertical (9:16)",
        "9:21": "Ultra Tall (9:21)",
      },
      type: "string",
      title: "Aspect Ratio",
    },
    resolution: {
      default: "720p",
      enum: ["480p", "720p", "1080p"],
      enumLabels: {
        "480p": "480p (Fast)",
        "720p": "720p (Balanced)",
        "1080p": "1080p (High Quality)",
      },
      type: "string",
      title: "Resolution",
    },
    duration: {
      default: "5",
      enum: ["5", "10"],
      enumLabels: {
        "5": "5 seconds",
        "10": "10 seconds",
      },
      type: "string",
      title: "Duration",
    },
    camera_fixed: {
      type: "boolean",
      default: false,
      title: "Fixed Camera",
      description: "Whether to fix the camera position",
    },
    seed: {
      type: "integer",
      minimum: -1,
      maximum: 2147483647,
      default: -1,
      title: "Seed",
      description: "Random seed for reproducibility. Use -1 for random.",
    },
    enable_safety_checker: {
      type: "boolean",
      default: true,
      title: "Safety Checker",
      description: "Check content for safety before processing",
    },
  },
  required: ["prompt"],
  type: "object",
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length > 10000) return { valid: false, error: "Prompt must be 10000 characters or less" };
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    prompt: inputs.prompt,
  };

  if (inputs.aspect_ratio) payload.aspect_ratio = inputs.aspect_ratio;
  if (inputs.resolution) payload.resolution = inputs.resolution;
  if (inputs.duration) payload.duration = inputs.duration;
  if (inputs.camera_fixed !== undefined) payload.camera_fixed = inputs.camera_fixed;
  if (inputs.seed !== undefined && inputs.seed !== null) payload.seed = inputs.seed;
  if (inputs.enable_safety_checker !== undefined) payload.enable_safety_checker = inputs.enable_safety_checker;

  return {
    model: MODEL_CONFIG.modelId,
    input: payload,
  };
}

export function calculateCost(inputs: Record<string, any>) {
  const base = MODEL_CONFIG.baseCreditCost;
  const durKey = (inputs.duration || "5") as keyof typeof MODEL_CONFIG.costMultipliers.duration;
  const resKey = (inputs.resolution || "720p") as keyof typeof MODEL_CONFIG.costMultipliers.resolution;

  const durMult = MODEL_CONFIG.costMultipliers.duration[durKey] || 1;
  const resMult = MODEL_CONFIG.costMultipliers.resolution[resKey] || 1;

  return Math.round(base * durMult * resMult * 100) / 100;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;
  const inputs: Record<string, any> = { prompt, ...modelParameters };
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
      prompt,
      tokens_used: cost,
      status: GENERATION_STATUS.PENDING,
      settings: sanitizeForStorage(modelParameters),
    })
    .select()
    .single();
  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  const { error: funcError } = await supabase.functions.invoke("generate-content", {
    body: {
      generationId: gen.id,
      model_config: MODEL_CONFIG,
      model_schema: SCHEMA,
      prompt,
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
