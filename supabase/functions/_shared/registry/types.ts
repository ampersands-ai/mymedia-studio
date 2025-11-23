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
  customParameters?: Record<string, any>;
  imageInput?: string;
  audioInput?: string;
}

export interface ModelModule {
  MODEL_CONFIG: ModelConfig;
  SCHEMA: any; // JSON Schema
  validate: (inputs: Record<string, any>) => ValidationResult;
  preparePayload: (inputs: Record<string, any>) => any;
  calculateCost: (inputs: Record<string, any>) => number;
  execute: (params: ExecuteParams) => Promise<string>; // Returns generation_id
}
