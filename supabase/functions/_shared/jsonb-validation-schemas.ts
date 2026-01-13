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

// ============================================================================
// SCHEMA PROPERTY TYPES (for dynamic validation)
// ============================================================================

export interface SchemaProperty {
  type?: string;
  enum?: (string | number)[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  required?: boolean;
  title?: string;
  description?: string;
}

export interface ModelSchema {
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

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
 * @deprecated Use validateGenerationSettingsWithSchema for dynamic validation
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
 * Validates generation settings using the model's schema dynamically
 * 
 * This function builds validation rules from the model_schema at runtime,
 * ensuring enum values match exactly what the model file defines.
 *
 * @param settings - Settings object to validate
 * @param modelSchema - The model's input_schema defining valid parameter values
 * @returns ValidationResult with success status and error details
 */
export function validateGenerationSettingsWithSchema(
  settings: unknown,
  modelSchema: { properties?: Record<string, unknown>; required?: string[] } | null | undefined
): ValidationResult {
  // Check size first (DoS prevention)
  if (!validateJsonbSize(settings)) {
    return {
      success: false,
      error: 'Settings object exceeds maximum size limit (50KB)',
    };
  }

  // If no schema provided, use basic validation (passthrough)
  if (!modelSchema?.properties) {
    // Just validate size and basic structure
    if (typeof settings !== 'object' || settings === null) {
      return {
        success: false,
        error: 'Settings must be an object',
      };
    }
    return {
      success: true,
      data: settings,
    };
  }

  // Build dynamic Zod schema from model_schema properties
  const schemaShape: Record<string, z.ZodTypeAny> = {
    // Always allow webhook token (internal security field)
    _webhook_token: z.string().min(16).max(128).optional(),
    enhance_prompt: z.boolean().optional(),
  };

  // Handle prompt fields with model-specific maxLength
  const promptFields = ['prompt', 'positivePrompt', 'negativePrompt'] as const;
  for (const field of promptFields) {
    const fieldSchema = modelSchema.properties?.[field] as { maxLength?: number } | undefined;
    const maxLen = fieldSchema?.maxLength || MAX_PROMPT_LENGTH;
    const fieldLabel = field === 'prompt' ? 'Prompt' : field === 'positivePrompt' ? 'Positive prompt' : 'Negative prompt';
    schemaShape[field] = z.string().max(maxLen, { 
      message: `${fieldLabel} exceeds ${maxLen.toLocaleString()} character limit`
    }).optional();
  }

  // Build validators from model schema properties
  for (const [key, propUnknown] of Object.entries(modelSchema.properties)) {
    // Skip if already defined above
    if (key in schemaShape) continue;

    // Cast to SchemaProperty for type safety
    const prop = propUnknown as SchemaProperty;

    if (prop.enum && Array.isArray(prop.enum) && prop.enum.length > 0) {
      // Check if enum contains numbers or strings
      const firstValue = prop.enum[0];
      
      if (typeof firstValue === 'number') {
        // Integer enum: use z.union with z.literal for each value
        const literals = prop.enum.map((val) => z.literal(val as number));
        if (literals.length >= 2) {
          schemaShape[key] = z.union([literals[0], literals[1], ...literals.slice(2)] as [z.ZodLiteral<number>, z.ZodLiteral<number>, ...z.ZodLiteral<number>[]]).optional();
        } else {
          // Single value enum - just use literal
          schemaShape[key] = z.literal(firstValue).optional();
        }
      } else {
        // String enum: use z.enum as before
        schemaShape[key] = z.enum(prop.enum as [string, ...string[]]).optional();
      }
    } else if (prop.type === 'string') {
      schemaShape[key] = z.string().max(MAX_STRING_LENGTH).optional();
    } else if (prop.type === 'number' || prop.type === 'integer') {
      let numSchema = z.number();
      if (prop.minimum !== undefined) numSchema = numSchema.min(prop.minimum);
      if (prop.maximum !== undefined) numSchema = numSchema.max(prop.maximum);
      schemaShape[key] = numSchema.optional();
    } else if (prop.type === 'boolean') {
      schemaShape[key] = z.boolean().optional();
    } else if (prop.type === 'array') {
      schemaShape[key] = z.array(z.any()).max(MAX_ARRAY_LENGTH).optional();
    } else {
      // Unknown type - allow any value (passthrough)
      schemaShape[key] = z.any().optional();
    }
  }

  // Create schema with passthrough for additional fields not in schema
  const dynamicSchema = z.object(schemaShape).passthrough();

  try {
    const validated = dynamicSchema.parse(settings);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      // Provide helpful error message including the field path
      const fieldPath = firstError.path.join('.');
      return {
        success: false,
        error: `Invalid settings format: ${fieldPath ? `Field '${fieldPath}': ` : ''}${firstError.message}`,
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
