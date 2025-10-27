import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

/**
 * Validation schemas for user-controlled JSONB fields
 */

// Generation settings schema
export const generationSettingsSchema = z.object({
  width: z.number().int().min(64).max(2048).optional(),
  height: z.number().int().min(64).max(2048).optional(),
  steps: z.number().int().min(1).max(100).optional(),
  guidance_scale: z.number().min(1).max(20).optional(),
  negative_prompt: z.string().max(2000).optional(),
  seed: z.number().int().optional(),
  batch_size: z.number().int().min(1).max(10).optional(),
  sampling_method: z.string().max(50).optional(),
  style: z.string().max(100).optional(),
  model_version: z.string().max(50).optional(),
}).strict().refine(
  (data) => {
    // Ensure reasonable object size
    const size = JSON.stringify(data).length;
    return size < 10000; // 10KB
  },
  { message: 'Settings object too large' }
);

// Workflow input schema
export const workflowInputSchema = z.record(
  z.string().max(100), // Key max length
  z.union([
    z.string().max(5000),
    z.number(),
    z.boolean(),
    z.array(z.string().max(500)).max(50),
  ])
).refine(
  (data) => {
    // Ensure reasonable object size
    const size = JSON.stringify(data).length;
    return size < 50000; // 50KB
  },
  { message: 'Input object too large' }
);

// Template preset parameters schema
export const presetParametersSchema = z.record(
  z.string().max(100),
  z.union([
    z.string().max(1000),
    z.number(),
    z.boolean(),
  ])
).refine(
  (data: Record<string, any>) => {
    const size = JSON.stringify(data).length;
    return size < 10000; // 10KB
  },
  { message: 'Preset parameters too large' }
);

// AI model input schema (for admin use)
export const modelInputSchemaValidator = z.record(
  z.string(),
  z.object({
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    required: z.boolean().optional(),
    description: z.string().max(500).optional(),
    default: z.any().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    enum: z.array(z.any()).optional(),
  })
).refine(
  (data) => {
    const size = JSON.stringify(data).length;
    return size < 50000; // 50KB
  },
  { message: 'Schema too large' }
);

/**
 * Validate and sanitize user input
 */
export function validateGenerationSettings(data: unknown) {
  return generationSettingsSchema.parse(data);
}

export function validateWorkflowInput(data: unknown) {
  return workflowInputSchema.parse(data);
}

export function validatePresetParameters(data: unknown) {
  return presetParametersSchema.parse(data);
}

export function validateModelInputSchema(data: unknown) {
  return modelInputSchemaValidator.parse(data);
}
