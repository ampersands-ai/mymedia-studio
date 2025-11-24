/** WAN 2.2 Turbo (prompt_to_video) - Record: 7d29fe4e-0a9b-4f3c-8e5d-1a6c9b2d4e8f */
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { executeModelGeneration } from "@/lib/models/shared/executeModelGeneration";
import { validatePrompt, combineValidations } from "@/lib/models/shared/validation";

export const MODEL_CONFIG = { 
  modelId: "wan/v2-2-turbo-prompt-to-video", 
  recordId: "7d29fe4e-0a9b-4f3c-8e5d-1a6c9b2d4e8f", 
  modelName: "WAN 2.2 Turbo", 
  provider: "kie_ai", 
  contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO", 
  baseCreditCost: 10, 
  estimatedTimeSeconds: 180, 
  costMultipliers: {}, 
  apiEndpoint: "/api/v1/jobs/createTask", 
  payloadStructure: "wrapper", 
  maxImages: 0, 
  defaultOutputs: 1, 
  
  // UI metadata
  isActive: true,
  logoUrl: "/logos/wan.png",
  modelFamily: "WAN",
  variantName: "WAN 2.2 Turbo",
  displayOrderInFamily: 1,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/WAN_2_2_Turbo.ts" 
} as const;

export const SCHEMA = { 
  properties: { 
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
    })
  );
}

export function preparePayload(inputs: Record<string, any>) { 
  return { 
    modelId: MODEL_CONFIG.modelId, 
    input: { prompt: inputs.prompt } 
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

