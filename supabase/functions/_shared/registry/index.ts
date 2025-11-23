/**
 * Deno-Compatible Model Registry for Edge Functions
 * ADR 007: Direct Model Execution via Model Registry
 *
 * This registry provides the same interface as the frontend registry
 * but uses Deno-compatible imports with .ts extensions.
 *
 * The models/ directory is a symlink to src/lib/models/locked/
 * so both frontend and edge functions use the EXACT SAME model files.
 */

import type { ModelModule } from './types.ts';

/**
 * Helper function: Convert contentType to database generation type
 */
export function getGenerationType(contentType: string): 'image' | 'video' | 'audio' | 'text' {
  const typeMap: Record<string, 'image' | 'video' | 'audio' | 'text'> = {
    'prompt_to_image': 'image',
    'image_editing': 'image',
    'image_to_video': 'video',
    'prompt_to_video': 'video',
    'prompt_to_audio': 'audio',
  };

  const type = typeMap[contentType];

  if (!type) {
    console.warn(`Unknown contentType: "${contentType}", defaulting to 'text'`);
    return 'text';
  }

  return type;
}

// Dynamic imports for better performance
// Only load models when needed

/**
 * Primary Registry: Maps record_id → model module path
 * This approach uses lazy loading - models are imported only when requested
 */
const MODEL_PATHS: Record<string, string> = {
  // Prompt to Audio (3 models)
  "7cd9f31d-82d6-49a8-a4ae-13dbe9b73c2f": "./models/prompt_to_audio/ElevenLabs_Fast.ts",
  "90a8c0e7-0c84-4a1e-a81f-06e0a22ef4d5": "./models/prompt_to_audio/ElevenLabs_TTS.ts",
  "a6d6e86a-83b2-4d7e-930d-85db8c96a61d": "./models/prompt_to_audio/Suno.ts",

  // Note: Full registry will be populated after initial testing
  // For now, implementing with a few models to validate approach
};

/**
 * Module-level cache to avoid re-importing
 */
const moduleCache = new Map<string, ModelModule>();

/**
 * Get a model by its record ID
 * Returns the model module with execute(), validate(), etc.
 */
export async function getModel(recordId: string): Promise<ModelModule> {
  // Check cache first
  if (moduleCache.has(recordId)) {
    return moduleCache.get(recordId)!;
  }

  // Get model path
  const modelPath = MODEL_PATHS[recordId];
  if (!modelPath) {
    throw new Error(`Model not found for record_id: ${recordId}`);
  }

  // Dynamic import (Deno-compatible)
  const module = await import(modelPath);
  const modelModule = module as ModelModule;

  // Cache for future use
  moduleCache.set(recordId, modelModule);

  return modelModule;
}

/**
 * Get model config without full module import
 * Useful for metadata lookups
 */
export async function getModelConfig(recordId: string) {
  const model = await getModel(recordId);
  return model.MODEL_CONFIG;
}

/**
 * Get all available model record IDs
 */
export function getAvailableModelRecordIds(): string[] {
  return Object.keys(MODEL_PATHS);
}

/**
 * Check if a model exists
 */
export function modelExists(recordId: string): boolean {
  return MODEL_PATHS.hasOwnProperty(recordId);
}

/**
 * Clear the module cache (useful for testing)
 */
export function clearCache(): void {
  moduleCache.clear();
}

/**
 * Get all models (expensive - loads all modules)
 * Use sparingly!
 */
export async function getAllModels(): Promise<ModelModule[]> {
  const recordIds = getAvailableModelRecordIds();
  const models = await Promise.all(
    recordIds.map(id => getModel(id))
  );
  return models;
}

/**
 * Get models by content type
 */
export async function getModelsByContentType(contentType: string): Promise<ModelModule[]> {
  const allModels = await getAllModels();
  return allModels.filter(m => m.MODEL_CONFIG.contentType === contentType);
}

/**
 * Get models by provider
 */
export async function getModelsByProvider(provider: string): Promise<ModelModule[]> {
  const allModels = await getAllModels();
  return allModels.filter(m => m.MODEL_CONFIG.provider === provider);
}
