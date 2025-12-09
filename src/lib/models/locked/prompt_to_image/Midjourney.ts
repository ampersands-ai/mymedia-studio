/** Midjourney (prompt_to_image) - Record: eff6c62e-c20e-4eed-9f5b-81e1a7f01529 */
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { executeModelGeneration } from "@/lib/models/shared/executeModelGeneration";

export const MODEL_CONFIG = {
  modelId: "midjourney/text-to-image",
  recordId: "eff6c62e-c20e-4eed-9f5b-81e1a7f01529",
  modelName: "Midjourney",
  provider: "kie_ai",
  contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 3,
  estimatedTimeSeconds: 45,
  costMultipliers: {
    speed: { relaxed: 1, fast: 1.3334, turbo: 2.66667 },
  },
  apiEndpoint: "/api/v1/mj/generate",
  payloadStructure: "flat",
  maxImages: 0,
  defaultOutputs: 4,
  // UI metadata
  isActive: true,
  logoUrl: "/logos/midjourney.png",
  modelFamily: "Midjourney",
  variantName: "Midjourney",
  displayOrderInFamily: 2,
  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Midjourney.ts",
} as const;

export const SCHEMA = {
  properties: {
    prompt: {
      maxLength: 2000,
      renderer: "prompt",
      type: "string",
      description: "Text prompt describing the desired image content",
    },
    aspectRatio: {
      default: "1:1",
      enum: ["1:2", "9:16", "2:3", "3:4", "5:6", "6:5", "4:3", "3:2", "1:1", "16:9", "2:1"],
      enumLabels: {
        "1:2": "Tall (1:2)",
        "9:16": "Portrait (9:16)",
        "2:3": "Portrait (2:3)",
        "3:4": "Portrait (3:4)",
        "5:6": "Portrait (5:6)",
        "6:5": "Landscape (6:5)",
        "4:3": "Landscape (4:3)",
        "3:2": "Landscape (3:2)",
        "1:1": "Square (1:1)",
        "16:9": "Widescreen (16:9)",
        "2:1": "Ultra Wide (2:1)",
      },
      type: "string",
    },
    speed: {
      default: "fast",
      enum: ["relaxed", "fast", "turbo"],
      enumLabels: {
        relaxed: "Relaxed (Slower, Cheaper)",
        fast: "Fast",
        turbo: "Turbo (Fastest)",
      },
      type: "string",
    },
    version: {
      default: "7",
      enum: ["7", "6.1", "6", "5.2", "5.1", "niji6"],
      enumLabels: {
        "7": "V7 (Latest)",
        "6.1": "V6.1",
        "6": "V6",
        "5.2": "V5.2",
        "5.1": "V5.1",
        niji6: "Niji 6 (Anime)",
      },
      isAdvanced: true,
      type: "string",
    },
    stylization: {
      default: 100,
      minimum: 0,
      maximum: 1000,
      step: 50,
      type: "integer",
      isAdvanced: true,
      description: "Artistic style intensity (0-1000). Higher = more stylized.",
    },
    variety: {
      default: 0,
      minimum: 0,
      maximum: 100,
      step: 5,
      type: "integer",
      isAdvanced: true,
      description: "Diversity of results (0-100). Higher = more diverse.",
    },
    weirdness: {
      default: 0,
      minimum: 0,
      maximum: 3000,
      step: 100,
      type: "integer",
      isAdvanced: true,
      description: "Creativity level (0-3000). Higher = more unusual.",
    },
  },
  required: ["prompt"],
  type: "object",
  "x-order": ["prompt", "aspectRatio", "speed", "version", "stylization"],
} as const;

export function validate(inputs: Record<string, any>) {
  if (!inputs.prompt) return { valid: false, error: "Prompt required" };
  if (inputs.prompt.length > 2000) return { valid: false, error: "Prompt must be 2000 characters or less" };
  if (inputs.stylization !== undefined && (inputs.stylization < 0 || inputs.stylization > 1000)) {
    return { valid: false, error: "stylization must be between 0 and 1000" };
  }
  if (inputs.variety !== undefined && (inputs.variety < 0 || inputs.variety > 100)) {
    return { valid: false, error: "variety must be between 0 and 100" };
  }
  if (inputs.weirdness !== undefined && (inputs.weirdness < 0 || inputs.weirdness > 3000)) {
    return { valid: false, error: "weirdness must be between 0 and 3000" };
  }
  return { valid: true };
}

export function preparePayload(inputs: Record<string, any>) {
  const payload: Record<string, any> = {
    taskType: "mj_txt2img",
    prompt: inputs.prompt,
    aspectRatio: inputs.aspectRatio || "1:1",
    speed: inputs.speed || "fast",
    version: inputs.version || "7",
  };

  // Add optional parameters only if provided and non-default
  if (inputs.stylization !== undefined && inputs.stylization !== 100) {
    payload.stylization = inputs.stylization;
  }
  if (inputs.variety !== undefined && inputs.variety !== 0) {
    payload.variety = inputs.variety;
  }
  if (inputs.weirdness !== undefined && inputs.weirdness !== 0) {
    payload.weirdness = inputs.weirdness;
  }

  return payload;
}

export function calculateCost(inputs: Record<string, any>) {
  const base = MODEL_CONFIG.baseCreditCost;
  const speedKey = (inputs.speed || "fast") as keyof typeof MODEL_CONFIG.costMultipliers.speed;
  const speedMult = MODEL_CONFIG.costMultipliers.speed[speedKey] || 1;
  return Math.round(base * speedMult * 100) / 100;
}

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  return executeModelGeneration({
    modelConfig: MODEL_CONFIG,
    modelSchema: SCHEMA,
    modelFunctions: { validate, calculateCost, preparePayload },
    params,
  });
}
