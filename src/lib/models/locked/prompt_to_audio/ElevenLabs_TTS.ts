/** Eleven Labs TTS (prompt_to_audio) - Record: 45fc7e71-0174-48eb-998d-547e8d2476db */
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { executeModelGeneration } from "@/lib/models/shared/executeModelGeneration";

export const MODEL_CONFIG = { modelId: "elevenlabs/text-to-speech-multilingual-v2", recordId: "45fc7e71-0174-48eb-998d-547e8d2476db", modelName: "Eleven Labs TTS", provider: "kie_ai", contentType: "prompt_to_audio",
  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_AUDIO", baseCreditCost: 3, estimatedTimeSeconds: 90, costMultipliers: {}, apiEndpoint: "/api/v1/jobs/createTask", payloadStructure: "wrapper", maxImages: 0, defaultOutputs: 1, 
  // UI metadata
  isActive: true,
  logoUrl: "/logos/elevenlabs.png",
  modelFamily: "ElevenLabs",
  variantName: "TTS",
  displayOrderInFamily: 2,

  // Lock system
  isLocked: true,
  lockedFilePath: "src/lib/models/locked/prompt_to_audio/ElevenLabs_TTS.ts" } as const;

export const SCHEMA = { properties: { similarity_boost: { default: 0.75, maximum: 1, minimum: 0, title: "Similarity boost (0-1)", type: "number" }, speed: { default: 1, description: "Speech speed (0.7-1.2)", maximum: 1.2, minimum: 0, title: "Input.Speed", type: "number" }, stability: { default: 0.5, maximum: 1, minimum: 0, title: "Voice stability (0-1)", type: "number" }, style: { default: 0, maximum: 1, minimum: 0, title: "Style exaggeration (0-1)", type: "number" }, text: { description: "The text to convert to speech", maxLength: 5000, title: "Input Text", type: "string" }, timestamps: { default: false, description: "Whether to return timestamps for each word in the generated speech", enum: [true, false], title: "Input.Timestamps", type: "boolean" }, voice: { default: "Rachel", description: "The voice to use for speech generation", enum: ["Rachel", "Aria", "Roger", "Sarah", "Laura", "Charlie", "George", "Callum", "River", "Liam", "Charlotte", "Alice", "Matilda", "Will", "Jessica", "Eric", "Chris", "Brian", "Daniel", "Lily", "Bill"], title: "Input.Voice", type: "string" } }, required: ["text"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.text ? { valid: true } : { valid: false, error: "Text required" }; }
export function preparePayload(inputs: Record<string, any>) { return { modelId: MODEL_CONFIG.modelId, input: { text: inputs.text, voice: inputs.voice || "Rachel", stability: inputs.stability || 0.5, similarity_boost: inputs.similarity_boost || 0.75, style: inputs.style || 0, speed: inputs.speed || 1, timestamps: inputs.timestamps || false } }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  return executeModelGeneration({
    modelConfig: MODEL_CONFIG,
    modelSchema: SCHEMA,
    modelFunctions: { validate, calculateCost, preparePayload },
    params,
    promptField: 'text'
  });
}
