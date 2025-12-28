/**
 * Flagship Model Guard - ADR 007 Extension
 * 
 * Performs a sanity check on app load to verify essential models are loaded.
 * Helps catch stale PWA cache issues or model registration problems early.
 */

import { logger } from '@/lib/logger';

/**
 * Flagship models that MUST be present in the model list.
 * If any of these are missing, something is wrong (usually stale cache).
 */
export const FLAGSHIP_MODEL_RECORD_IDS = [
  'd4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f9a', // Z-Image Turbo (Runware)
  '94b43382-bf4b-490d-82b5-265d14473f9b', // ChatGPT 4o Image
  '379f8945-bd7f-48f3-a1bb-9d2e2413234c', // Eleven Labs Fast
] as const;

/**
 * Minimum expected model count from registry.
 * If we have significantly fewer, something is likely wrong.
 */
export const MIN_EXPECTED_MODEL_COUNT = 50;

export interface ModelGuardResult {
  isHealthy: boolean;
  loadedCount: number;
  missingFlagshipIds: string[];
  belowMinimum: boolean;
}

/**
 * Checks if the loaded models meet baseline expectations.
 * Run this after models are loaded from registry.
 * 
 * @param loadedModelRecordIds - Array of record_ids from loaded models
 * @returns Guard result with health status and diagnostics
 */
export function checkModelHealth(loadedModelRecordIds: string[]): ModelGuardResult {
  const loadedSet = new Set(loadedModelRecordIds);
  
  const missingFlagshipIds = FLAGSHIP_MODEL_RECORD_IDS.filter(
    id => !loadedSet.has(id)
  );
  
  const belowMinimum = loadedModelRecordIds.length < MIN_EXPECTED_MODEL_COUNT;
  const isHealthy = missingFlagshipIds.length === 0 && !belowMinimum;

  if (!isHealthy) {
    logger.warn('Model health check failed', {
      component: 'flagshipModelGuard',
      loadedCount: loadedModelRecordIds.length,
      missingFlagshipIds,
      belowMinimum,
    });
  }

  return {
    isHealthy,
    loadedCount: loadedModelRecordIds.length,
    missingFlagshipIds,
    belowMinimum,
  };
}

/**
 * Get human-readable names for missing flagship models.
 * Used in user-facing warnings.
 */
export function getMissingFlagshipNames(missingIds: string[]): string[] {
  const idToName: Record<string, string> = {
    'd4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f9a': 'Z-Image Turbo',
    '94b43382-bf4b-490d-82b5-265d14473f9b': 'ChatGPT 4o Image',
    '379f8945-bd7f-48f3-a1bb-9d2e2413234c': 'Eleven Labs Fast',
  };
  
  return missingIds.map(id => idToName[id] || id);
}
