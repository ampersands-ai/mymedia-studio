/** Grok Imagine (prompt_to_video) - Record: 0643a43b-4995-4c5b-ac1d-76ea257a93a0 */
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { executeModelGeneration } from "@/lib/models/shared/executeModelGeneration";
import { validatePrompt, validateEnum, combineValidations } from "@/lib/models/shared/validation";

export const MODEL_CONFIG = { 
  modelId: "grok-imagine/text-to-video", 
  recordId: "0643a43b-4995-4c5b-ac1d-76ea257a93a0", 
  modelName: "Grok Imagine", 
  provider: "kie_ai", 
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO", 
  baseCreditCost: 10, 
  estimatedTimeSeconds: 45, 
  costMultipliers: {}, 
  apiEndpoint: "/api/v1/jobs/createTask", 
  payloadStructure: "wrapper", 
  maxImages: 0, 
  defaultOutputs: 1, 
  
  // UI metadata
  isActive: true,
  logoUrl: "/logos/grok.png",
  modelFamily: "xAI",
  variantName: "Grok Imagine",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Grok_Imagine.ts" 
} as const;

export const SCHEMA = { 
  properties: { 
    mode: { 
      default: "normal", 
      enum: ["fun", "normal", "spicy"], 
      type: "string" 
    }, 
    prompt: { 
      maxLength: 5000, 
      renderer: "prompt", 
      type: "string" 
    } 
  }, 
  required: ["prompt"], 
  type: "object" 
} as const;

/**
 * Enhanced validation with comprehensive security checks
 * Phase 1: Strengthen validation across all models
 */
export function validate(inputs: Record<string, any>) {
  return combineValidations(
    validatePrompt(inputs.prompt, {
      required: true,
      minLength: 3,
      maxLength: 5000,
      fieldName: "Prompt"
    }),
    validateEnum(inputs.mode, ["fun", "normal", "spicy"], {
      required: false,
      fieldName: "Mode"
    })
  );
}

export function preparePayload(inputs: Record<string, any>) { 
  return { 
    modelId: MODEL_CONFIG.modelId, 
    input: { 
      prompt: inputs.prompt, 
      mode: inputs.mode || "normal" 
    } 
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

