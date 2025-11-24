/** Ideogram V3 (prompt_to_image) - Record: 94c0e508-226a-4e3d-8229-3820a61faa88 */
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { executeModelGeneration } from "@/lib/models/shared/executeModelGeneration";

export const MODEL_CONFIG = { modelId: "ideogram/v3-text-to-image", recordId: "94c0e508-226a-4e3d-8229-3820a61faa88", modelName: "Ideogram V3", provider: "kie_ai", contentType: "prompt_to_image",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE", baseCreditCost: 1.75, estimatedTimeSeconds: 35, costMultipliers: { "num_images": { "1": 1, "2": 2, "3": 3, "4": 4 }, "rendering_speed": { "BALANCED": 2, "QUALITY": 3, "TURBO": 1 } }, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/ideogram.png",
  modelFamily: "Ideogram",
  variantName: "V3",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_image/Ideogram_V3.ts" } as const;

export const SCHEMA = { properties: { aspect_ratio: { default: "1:1", enum: ["1:1", "3:4", "4:3", "9:16", "16:9"], type: "string" }, magic_prompt_option: { default: "AUTO", enum: ["AUTO", "ON", "OFF"], type: "string" }, prompt: { maxLength: 5000, renderer: "prompt", type: "string" }, seed: { type: "integer" }, style_type: { default: "AUTO", enum: ["AUTO", "GENERAL", "REALISTIC", "DESIGN", "RENDER_3D", "ANIME"], type: "string" } }, required: ["prompt"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.prompt ? { valid: true } : { valid: false, error: "Prompt required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { prompt: inputs.prompt, aspect_ratio: inputs.aspect_ratio || "1:1", magic_prompt_option: inputs.magic_prompt_option || "AUTO", style_type: inputs.style_type || "AUTO", ...(inputs.seed && { seed: inputs.seed }) } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  return executeModelGeneration({
    modelConfig: MODEL_CONFIG,
    modelSchema: SCHEMA,
    modelFunctions: { validate, calculateCost, preparePayload },
    params
  });
}
