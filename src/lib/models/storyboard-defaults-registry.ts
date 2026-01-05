/**
 * Storyboard Defaults Registry
 * 
 * Central lookup for model-specific storyboard parameter defaults.
 * Each model file exports a getStoryboardDefaults() function that
 * returns exactly the parameters that provider accepts.
 */

import type { StoryboardContext, StoryboardDefaults } from './types/storyboard';

// Import model storyboard defaults functions
import { getStoryboardDefaults as getSeedanceI2VDefaults } from './locked/image_to_video/Runware_Seedance_Pro_Fast_I2V';
import { getStoryboardDefaults as getSeedanceV1ProFastDefaults } from './locked/image_to_video/Seedance_V1_0_Pro_Fast_runware';
import { getStoryboardDefaults as getFluxProDefaults } from './locked/prompt_to_image/FLUX_1_Pro';

/**
 * Registry mapping model record IDs to their storyboard defaults functions
 */
const STORYBOARD_DEFAULTS_REGISTRY: Record<string, (ctx: StoryboardContext) => StoryboardDefaults> = {
  // Image-to-Video models
  'a1b2c3d4-e5f6-0a1b-2c3d-4e5f6a7b8c9d': getSeedanceI2VDefaults, // Runware Seedance Pro Fast I2V
  '3ac57af3-f7f0-4205-b1a4-3c7c3c1c7dad': getSeedanceV1ProFastDefaults, // Seedance V1.0 Pro Fast
  
  // Prompt-to-Image models
  '7a2f8c3e-4b5d-6e9a-1f8c-2d4b6e9a3f5c': getFluxProDefaults, // FLUX.1 Pro
};

/**
 * Get storyboard-specific defaults for a model
 * 
 * @param modelRecordId - The model's record_id
 * @param context - Storyboard context (prompt, aspectRatio, inputImage, etc.)
 * @returns Exact provider-ready parameters, or null if model not in registry
 */
export function getModelStoryboardDefaults(
  modelRecordId: string,
  context: StoryboardContext
): StoryboardDefaults | null {
  const getDefaults = STORYBOARD_DEFAULTS_REGISTRY[modelRecordId];
  
  if (!getDefaults) {
    console.warn(`[StoryboardRegistry] No storyboard defaults for model: ${modelRecordId}`);
    return null;
  }
  
  return getDefaults(context);
}

/**
 * Check if a model has storyboard defaults registered
 */
export function hasStoryboardDefaults(modelRecordId: string): boolean {
  return modelRecordId in STORYBOARD_DEFAULTS_REGISTRY;
}
