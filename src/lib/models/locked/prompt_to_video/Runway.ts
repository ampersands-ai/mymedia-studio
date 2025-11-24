/** Runway (prompt_to_video) - Record: 9efdc56b-6a76-4c82-94cf-16285d8c3e7d */
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { executeModelGeneration } from "@/lib/models/shared/executeModelGeneration";

export const MODEL_CONFIG = { modelId: "runway-duration-5-generate model", recordId: "9efdc56b-6a76-4c82-94cf-16285d8c3e7d", modelName: "Runway", provider: "kie_ai", contentType: "prompt_to_video",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO", baseCreditCost: 3, estimatedTimeSeconds: 300, costMultipliers: { "duration": { "10": 2.5 }, "quality": { "1080p": 2.5 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/runway.png",
  modelFamily: "Runway",
  variantName: "Runway",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_video/Runway.ts" } as const;

export const SCHEMA = { properties: { duration: { default: "5", enum: ["5", "10"], type: "string" }, prompt: { maxLength: 5000, renderer: "prompt", type: "string" } }, required: ["prompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, duration: inputs.duration || "5" } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost * (inputs.duration === "10" ? 2 : 1); }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  return executeModelGeneration({
    modelConfig: MODEL_CONFIG,
    modelSchema: SCHEMA,
    modelFunctions: { validate, calculateCost, preparePayload },
    params
  });
}

