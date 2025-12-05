/**
 * JSONB Validation Schemas
 *
 * Server-side validation for user-controlled JSONB fields to prevent:
 * - Malicious payload injection
 * - DoS attacks via oversized objects
 * - Application logic breaks from unexpected data shapes
 * - SQL injection attempts in JSONB values
 *
 * CRITICAL: All JSONB fields that accept user input MUST be validated
 * before being stored in the database.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ============================================================================
// SIZE LIMITS (DoS Prevention)
// ============================================================================

export const MAX_JSONB_SIZE = 50000; // 50KB limit per JSONB field
export const MAX_STRING_LENGTH = 10000; // Individual string field limit
export const MAX_ARRAY_LENGTH = 100; // Max items in arrays
export const MAX_PROMPT_LENGTH = 5000; // Max prompt text length

/**
 * Validates JSONB size to prevent DoS attacks
 *
 * @param data - Any JSON-serializable data
 * @returns True if size is within limits
 */
export function validateJsonbSize(data: unknown): boolean {
  try {
    const size = JSON.stringify(data).length;
    return size <= MAX_JSONB_SIZE;
  } catch {
    return false;
  }
}

// ============================================================================
// GENERATION SETTINGS VALIDATION
// ============================================================================

/**
 * Validation schema for generations.settings JSONB column
 *
 * This field stores all model parameters for a generation.
 * It's user-controlled and needs strict validation.
 */
export const generationSettingsSchema = z.object({
  // Webhook security token (system-generated)
  _webhook_token: z.string().min(16).max(128).optional(),

  // Common generation parameters
  prompt: z.string().max(MAX_PROMPT_LENGTH).optional(),
  positivePrompt: z.string().max(MAX_PROMPT_LENGTH).optional(),
  negativePrompt: z.string().max(MAX_PROMPT_LENGTH).optional(),
  enhance_prompt: z.boolean().optional(),

  // Image parameters
  aspect_ratio: z.string().max(20).optional(),
  width: z.number().int().min(64).max(4096).optional(),
  height: z.number().int().min(64).max(4096).optional(),
  style: z.string().max(50).optional(),
  quality: z.enum(['low', 'medium', 'high', 'ultra', 'hd']).optional(),
  outputFormat: z.enum(['PNG', 'JPEG', 'WEBP', 'MP4', 'WAV', 'MP3']).optional(),

  // Video parameters
  duration: z.number().min(1).max(300).optional(), // Max 5 minutes
  fps: z.number().int().min(1).max(60).optional(),

  // Audio parameters
  voice_id: z.string().uuid().optional(),
  stability: z.number().min(0).max(1).optional(),
  similarity_boost: z.number().min(0).max(1).optional(),

  // Advanced parameters
  seed: z.number().int().optional(),
  guidance_scale: z.number().min(0).max(20).optional(),
  num_inference_steps: z.number().int().min(1).max(100).optional(),
  strength: z.number().min(0).max(1).optional(),

  // File references
  inputImage: z.string().url().max(1000).optional(),
  startFrame: z.string().url().max(1000).optional(),
  endFrame: z.string().url().max(1000).optional(),

  // Allow additional fields (models define their own parameters)
  // Note: SQL injection protection is handled by parameterized queries in Supabase
  // JSONB values are stored as data, not executed as SQL
}).passthrough();

// ============================================================================
// WORKFLOW USER INPUTS VALIDATION
// ============================================================================

/**
 * Validation schema for workflow_executions.user_inputs JSONB column
 *
 * This stores user inputs for workflow templates.
 */
export const workflowUserInputsSchema = z.object({
  prompt: z.string().max(MAX_PROMPT_LENGTH).optional(),
  parameters: z.record(z.any()).optional(),
  uploadedImages: z.array(z.string().url()).max(MAX_ARRAY_LENGTH).optional(),
}).strict(); // Reject unknown properties

// ============================================================================
// STORYBOARD VOICE SETTINGS VALIDATION
// ============================================================================

/**
 * Validation schema for storyboards.voice_settings JSONB column
 *
 * This stores voice configuration for storyboard narration.
 */
export const voiceSettingsSchema = z.object({
  voice_id: z.string().uuid().optional(),
  stability: z.number().min(0).max(1).optional(),
  similarity_boost: z.number().min(0).max(1).optional(),
  style: z.number().min(0).max(1).optional(),
  use_speaker_boost: z.boolean().optional(),
}).strict();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export interface ValidationResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Validates generation settings with comprehensive checks
 *
 * @param settings - Settings object to validate
 * @returns ValidationResult with success status and error details
 */
export function validateGenerationSettings(settings: unknown): ValidationResult {
  // Check size first (DoS prevention)
  if (!validateJsonbSize(settings)) {
    return {
      success: false,
      error: 'Settings object exceeds maximum size limit (50KB)',
    };
  }

  // Validate structure with Zod
  try {
    const validated = generationSettingsSchema.parse(settings);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Invalid settings format: ${error.errors[0].message}`,
      };
    }
    return {
      success: false,
      error: 'Invalid settings format',
    };
  }
}

/**
 * Validates workflow user inputs
 *
 * @param inputs - User inputs object to validate
 * @returns ValidationResult with success status and error details
 */
export function validateWorkflowInputs(inputs: unknown): ValidationResult {
  if (!validateJsonbSize(inputs)) {
    return {
      success: false,
      error: 'User inputs object exceeds maximum size limit (50KB)',
    };
  }

  try {
    const validated = workflowUserInputsSchema.parse(inputs);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Invalid user inputs format: ${error.errors[0].message}`,
      };
    }
    return {
      success: false,
      error: 'Invalid user inputs format',
    };
  }
}

/**
 * Validates voice settings
 *
 * @param settings - Voice settings object to validate
 * @returns ValidationResult with success status and error details
 */
export function validateVoiceSettings(settings: unknown): ValidationResult {
  if (!validateJsonbSize(settings)) {
    return {
      success: false,
      error: 'Voice settings object exceeds maximum size limit (50KB)',
    };
  }

  try {
    const validated = voiceSettingsSchema.parse(settings);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Invalid voice settings format: ${error.errors[0].message}`,
      };
    }
    return {
      success: false,
      error: 'Invalid voice settings format',
    };
  }
}
