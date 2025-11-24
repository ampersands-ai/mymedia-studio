/**
 * Shared type definitions for Model Registry
 * Compatible with both Deno (edge functions) and Node (frontend)
 */

export interface ModelConfig {
  id: string;
  recordId: string;
  modelName: string;
  provider: string;
  contentType: string;
  modelFamily?: string;
  baseCost: number;
  costType?: string;
  estimatedTimeSeconds?: number;
  maxPromptLength?: number;
  logoUrl?: string;
  isActive: boolean;
  isCustomModel?: boolean;
  supportsNegativePrompt?: boolean;
  requiresImageInput?: boolean;
  requiresAudioInput?: boolean;
  outputFormat?: string;
  supportedAspectRatios?: string[];
  supportedResolutions?: string[];
  maxDurationSeconds?: number;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ExecuteParams {
  userId: string;
  prompt: string;
  customParameters?: Record<string, unknown>;
  imageInput?: string;
  audioInput?: string;
}

export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface ModelModule {
  MODEL_CONFIG: ModelConfig;
  SCHEMA: JsonSchema;
  validate: (inputs: Record<string, unknown>) => ValidationResult;
  preparePayload: (inputs: Record<string, unknown>) => Record<string, unknown>;
  calculateCost: (inputs: Record<string, unknown>) => number;
  execute: (params: ExecuteParams) => Promise<string>; // Returns generation_id
}
