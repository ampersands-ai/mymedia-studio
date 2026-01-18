/**
 * Deno-Compatible Model Registry for Edge Functions
 * 
 * Uses STATIC metadata imports instead of dynamic model file imports.
 * This avoids "Module not found" errors caused by frontend-only imports
 * in model files (e.g., @/lib/..., @/integrations/...).
 * 
 * The model-metadata.ts file is the single source of truth for model
 * metadata used by edge functions.
 */

import { 
  MODEL_METADATA, 
  getModelMetadata, 
  getAvailableModelRecordIds as getAvailableIds,
  modelExists as checkModelExists,
  getModelsByContentType as filterByContentType,
  getModelsByProvider as filterByProvider,
  type ModelMetadata 
} from '../model-metadata.ts';

/**
 * Helper function: Convert contentType to database generation type
 */
export function getGenerationType(contentType: string): 'image' | 'video' | 'audio' | 'text' {
  const typeMap: Record<string, 'image' | 'video' | 'audio' | 'text'> = {
    'prompt_to_image': 'image',
    'image_editing': 'image',
    'image_to_image': 'image',
    'image_to_video': 'video',
    'prompt_to_video': 'video',
    'lip_sync': 'video',
    'video_to_video': 'video',
    'prompt_to_audio': 'audio',
    'text_to_audio': 'audio',
    'speech_to_text': 'text',
    'audio_to_audio': 'audio',
  };

  const type = typeMap[contentType];

  if (!type) {
    // Unknown contentType, defaulting to 'text'
    return 'text';
  }

  return type;
}

/**
 * Get model config by record ID
 * Returns the static metadata for the model
 */
export function getModelConfig(recordId: string): ModelMetadata {
  const metadata = getModelMetadata(recordId);
  if (!metadata) {
    throw new Error(`Model not found for record_id: ${recordId}`);
  }
  return metadata;
}

/**
 * Get all available model record IDs
 */
export function getAvailableModelRecordIds(): string[] {
  return getAvailableIds();
}

/**
 * Check if a model exists
 */
export function modelExists(recordId: string): boolean {
  return checkModelExists(recordId);
}

/**
 * Get models by content type
 */
export function getModelsByContentType(contentType: string): ModelMetadata[] {
  return filterByContentType(contentType);
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: string): ModelMetadata[] {
  return filterByProvider(provider);
}

// Re-export types and metadata for convenience
export { MODEL_METADATA, type ModelMetadata };
