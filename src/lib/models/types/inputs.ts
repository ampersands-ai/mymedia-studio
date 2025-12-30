/**
 * Typed model inputs - backwards compatible with existing Record<string, any>
 * 
 * These types augment, not replace, existing patterns.
 * Use for new code requiring better type safety.
 * 
 * @module models/types/inputs
 */

/**
 * Base interface for all model inputs
 * Allows additional properties for backward compatibility
 */
export interface BaseModelInputs {
  prompt?: string;
  [key: string]: unknown;
}

/**
 * Image generation model inputs
 */
export interface ImageGenerationInputs extends BaseModelInputs {
  prompt: string;
  aspect_ratio?: string;
  resolution?: string;
  width?: number;
  height?: number;
  outputFormat?: string;
  numberResults?: number;
  negative_prompt?: string;
}

/**
 * Video generation model inputs
 */
export interface VideoGenerationInputs extends BaseModelInputs {
  prompt: string;
  duration?: string | number;
  aspect_ratio?: string;
  image_url?: string;
  video_url?: string;
  fps?: number;
  resolution?: string;
}

/**
 * Image-to-video model inputs
 */
export interface ImageToVideoInputs extends BaseModelInputs {
  prompt?: string;
  image_url: string;
  duration?: string | number;
  motion_bucket_id?: number;
  fps?: number;
}

/**
 * Audio generation model inputs
 */
export interface AudioGenerationInputs extends BaseModelInputs {
  prompt?: string;
  text?: string;
  voice_id?: string;
  duration?: number;
  language?: string;
}

/**
 * Image editing model inputs
 */
export interface ImageEditingInputs extends BaseModelInputs {
  prompt: string;
  image_url: string;
  mask_url?: string;
  strength?: number;
}

/**
 * Lip sync model inputs
 */
export interface LipSyncInputs extends BaseModelInputs {
  video_url: string;
  audio_url: string;
  sync_mode?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: Record<string, string>;
}

/**
 * Type guard for successful validation
 */
export function isValidationSuccess(
  result: ValidationResult
): result is ValidationResult & { valid: true } {
  return result.valid === true;
}

/**
 * Type guard for failed validation
 */
export function isValidationFailure(
  result: ValidationResult
): result is ValidationResult & { valid: false; error: string } {
  return result.valid === false;
}

/**
 * Create a successful validation result
 */
export function validationSuccess(): ValidationResult {
  return { valid: true };
}

/**
 * Create a failed validation result
 */
export function validationFailure(
  error: string,
  details?: Record<string, string>
): ValidationResult {
  return { valid: false, error, details };
}

/**
 * Model content types
 */
export type ContentType = 
  | 'prompt_to_image'
  | 'image_editing'
  | 'prompt_to_video'
  | 'image_to_video'
  | 'video_to_video'
  | 'lip_sync'
  | 'prompt_to_audio';

/**
 * Map content type to appropriate input interface
 */
export type InputsForContentType<T extends ContentType> = 
  T extends 'prompt_to_image' ? ImageGenerationInputs :
  T extends 'image_editing' ? ImageEditingInputs :
  T extends 'prompt_to_video' ? VideoGenerationInputs :
  T extends 'image_to_video' ? ImageToVideoInputs :
  T extends 'video_to_video' ? VideoGenerationInputs :
  T extends 'lip_sync' ? LipSyncInputs :
  T extends 'prompt_to_audio' ? AudioGenerationInputs :
  BaseModelInputs;
