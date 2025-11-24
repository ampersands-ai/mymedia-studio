/** FLUX.1 Pro prompt_to_image - Record: 7a2f8c3e-4b5d-6e9a-1f8c-2d4b6e9a3f5c */
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { executeModelGeneration } from "@/lib/models/shared/executeModelGeneration";
import { validatePrompt, validateEnum, combineValidations } from "@/lib/models/shared/validation";

export const MODEL_CONFIG = {
  modelId: "runware:100@1",
  recordId: "7a2f8c3e-4b5d-6e9a-1f8c-2d4b6e9a3f5c",
  modelName: "FLUX.1 Pro",
  provider: "runware",
  contentType: "prompt_to_image",
  use_api_key: "RUNWARE_API_KEY_PROMPT_TO_IMAGE",
  baseCreditCost: 0.2,
  estimatedTimeSeconds: 15,
  costMultipliers: {},
  apiEndpoint: "https://api.runware.ai/v1",
  payloadStructure: "flat",
  maxImages: 0,
  defaultOutputs: 1,

  // UI metadata
  isActive: true,
  logoUrl: "/logos/flux.png",
  modelFamily: "FLUX",
  variantName: "1 Pro",
  displayOrderInFamily: 3,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/FLUX_1_Pro.ts"
} as const;

export const SCHEMA = {
  properties: {
    positivePrompt: {
      maxLength: 5000,
      renderer: "prompt",
      title: "Prompt",
      type: "string"
    },
    numberResults: {
      default: 1,
      showToUser: false,
      type: "integer"
    },
    outputFormat: {
      default: "PNG",
      enum: ["WEBP", "JPEG", "PNG"],
      type: "string"
    }
  },
  required: ["positivePrompt", "numberResults", "outputFormat"],
  type: "object"
} as const;

/**
 * Enhanced validation with comprehensive security checks
 * Phase 1: Strengthen validation across all models
 */
export function validate(inputs: Record<string, any>) {
  return combineValidations(
    validatePrompt(inputs.positivePrompt, {
      required: true,
      minLength: 3,
      maxLength: 5000,
      fieldName: "Prompt"
    }),
    validateEnum(inputs.outputFormat, ["WEBP", "JPEG", "PNG"], {
      required: false,
      fieldName: "Output Format"
    })
  );
}

export function preparePayload(inputs: Record<string, any>) {
  return {
    taskType: "imageInference",
    positivePrompt: inputs.positivePrompt,
    numberResults: inputs.numberResults || 1,
    outputFormat: inputs.outputFormat || "PNG",
    width: 896,
    height: 1152,
    steps: 4,
    CFGScale: 1,
    scheduler: "FlowMatchEulerDiscreteScheduler",
    includeCost: true,
    checkNSFW: true,
    outputType: ["URL"]
  };
}

export function calculateCost(inputs: Record<string, any>) {
  return MODEL_CONFIG.baseCreditCost;
}

/**
 * Unified execution using shared logic
 * Phase 1: Extract duplicate model execution logic
 */
export async function execute(params: ExecuteGenerationParams): Promise<string> {
  return executeModelGeneration(params, MODEL_CONFIG, SCHEMA, {
    validate,
    preparePayload,
    calculateCost
  });
}
