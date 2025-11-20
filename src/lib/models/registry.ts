/**
 * Central Model Registry - ADR 007
 * 
 * This is the clean export wrapper for the model registry.
 * Import models from here instead of locked/index.ts for better ergonomics.
 * 
 * Usage:
 * ```typescript
 * import { getModel, getAllModels, getModelsByContentType } from '@/lib/models/registry';
 * 
 * // Get specific model
 * const model = getModel(recordId);
 * await model.execute(params);
 * 
 * // Get all models for UI
 * const allModels = getAllModels();
 * 
 * // Filter by content type
 * const imageModels = getModelsByContentType('image');
 * ```
 */

export {
  RECORD_ID_REGISTRY,
  MODEL_REGISTRY,
  getModel,
  getAllModels,
  getModelsByContentType,
  getModelsByProvider,
  getModelModule,
  modelFileExists,
  getAvailableModelRecordIds,
  getAvailableModelIds,
  getGenerationType,
  type ModelModule
} from './locked/index';
