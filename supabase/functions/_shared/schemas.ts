import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * Shared Zod schemas for edge function validation
 * Provides type-safe request/response validation across all edge functions
 */

// ==================== Workflow Executor Schemas ====================

export const WorkflowExecutorRequestSchema = z.object({
  workflow_template_id: z.string().uuid("Invalid workflow template ID format"),
  user_inputs: z.record(z.unknown()),
});

export const WorkflowStepSchema = z.object({
  step_number: z.number().int().positive(),
  step_name: z.string().min(1, "Step name cannot be empty"),
  model_id: z.string().optional(),
  model_record_id: z.string().uuid().optional(),
  prompt_template: z.string(),
  parameters: z.record(z.unknown()).optional(),
  input_mappings: z.record(z.string()).optional(),
});

export const WorkflowTemplateSchema = z.object({
  id: z.string().uuid(),
  workflow_steps: z.array(WorkflowStepSchema),
  user_input_fields: z.array(z.unknown()).optional(),
});

// ==================== Generate Caption Schemas ====================

export const GenerateCaptionRequestSchema = z.object({
  generation_id: z.string().uuid().optional(),
  video_job_id: z.string().uuid().optional(),
  prompt: z.string().min(1, "Prompt cannot be empty"),
  content_type: z.enum(['image', 'video'], {
    errorMap: () => ({ message: "Content type must be 'image' or 'video'" })
  }),
  model_name: z.string().optional(),
}).refine(
  (data) => data.generation_id || data.video_job_id,
  { message: "Either generation_id or video_job_id is required" }
);

export const CaptionResponseSchema = z.object({
  caption: z.string()
    .min(50, "Caption must be at least 50 characters")
    .regex(/[.!?]$/, "Caption must end with proper punctuation"),
  hashtags: z.array(
    z.string()
      .regex(/^#[A-Za-z0-9_]+$/, "Hashtags must be # followed by letters/numbers/underscores only (no spaces)")
      .max(50, "Hashtag too long")
  )
    .min(10, "Must have at least 10 hashtags")
    .max(15, "Must have at most 15 hashtags"),
});

export const AIToolCallSchema = z.object({
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

// ==================== Generate Content Schemas ====================

/**
 * Model configuration sent from client (from .ts registry)
 * This eliminates the need for database lookups
 */
export const ModelConfigSchema = z.object({
  modelId: z.string(),
  recordId: z.string().uuid(),
  modelName: z.string(),
  provider: z.string(),
  contentType: z.string(),
  use_api_key: z.string().optional(),
  apiEndpoint: z.string().nullable().optional(),
  payloadStructure: z.string().optional(),
  baseCreditCost: z.number(),
  estimatedTimeSeconds: z.number().optional(),
  // Support both flat (Record<string, number>) and nested (Record<string, Record<string, number>>) structures
  // Using z.any() to allow flexible nested structures that token-calculator.ts handles
  // Allow null, undefined, or object (some models set costMultipliers: null explicitly)
  costMultipliers: z.record(z.any()).nullable().optional(),
  maxImages: z.number().nullable().optional(),
  defaultOutputs: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const ModelSchemaDefinition = z.object({
  type: z.string(),
  properties: z.record(z.any()),
  required: z.array(z.string()).optional(),
  imageInputField: z.string().optional(),
});

export const GenerateContentRequestSchema = z.object({
  // Optional: Existing generation ID to update instead of creating new
  generationId: z.string().uuid().optional(),
  
  // REQUIRED: Full model config from .ts registry (database eliminated)
  model_config: ModelConfigSchema,
  model_schema: ModelSchemaDefinition,

  // Request parameters
  prompt: z.string().optional(),
  custom_parameters: z.record(z.unknown()).default({}),
  enhance_prompt: z.boolean().default(false),
  enhancement_provider: z.enum(['lovable_ai', 'openai']).default('lovable_ai'),
  workflow_execution_id: z.string().uuid().optional(),
  workflow_step_number: z.number().int().positive().optional(),
  user_id: z.string().uuid().optional(),
  test_mode: z.boolean().default(false),
  test_run_id: z.string().uuid().optional(), // For comprehensive model testing system
  
  // Pre-calculated cost from model's calculateCost() function (for audio-duration-based pricing)
  // When provided, edge function uses this instead of recalculating
  preCalculatedCost: z.number().positive().max(10000).optional(),
});

export const ModelInputSchemaPropertySchema = z.object({
  type: z.string().optional(),
  enum: z.array(z.unknown()).optional(),
  default: z.unknown().optional(),
  description: z.string().optional(),
});

export const ModelInputSchemaSchema = z.object({
  properties: z.record(ModelInputSchemaPropertySchema).optional(),
  required: z.array(z.string()).optional(),
});

export const ModelSchema = z.object({
  id: z.string(),
  record_id: z.string().uuid(),
  provider: z.string(),
  base_token_cost: z.number().nonnegative(),
  input_schema: ModelInputSchemaSchema.nullable().optional(),
  is_active: z.boolean(),
  cost_multipliers: z.record(z.unknown()).optional(),
  is_async: z.boolean().optional(),
});


export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
});

export const GenerationRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.string(),
  prompt: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  tokens_used: z.number(),
  tokens_charged: z.number().nullable().optional(),
  actual_token_cost: z.number().nullable().optional(),
  created_at: z.string(),
  model_id: z.string().nullable().optional(),
  model_record_id: z.string().nullable().optional(),
  template_id: z.string().nullable().optional(),
  original_prompt: z.string().nullable().optional(),
  enhanced_prompt: z.string().nullable().optional(),
  enhancement_provider: z.string().nullable().optional(),
  output_url: z.string().nullable().optional(),
  storage_path: z.string().nullable().optional(),
  provider_task_id: z.string().nullable().optional(),
  provider_request: z.record(z.unknown()).nullable().optional(),
  provider_response: z.record(z.unknown()).nullable().optional(),
  settings: z.record(z.unknown()).nullable().optional(),
  file_size_bytes: z.number().nullable().optional(),
  ai_caption: z.string().nullable().optional(),
  ai_hashtags: z.array(z.string()).nullable().optional(),
  caption_generated_at: z.string().nullable().optional(),
  parent_generation_id: z.string().uuid().nullable().optional(),
  output_index: z.number().int().nullable().optional(),
  is_batch_output: z.boolean().nullable().optional(),
  workflow_execution_id: z.string().uuid().nullable().optional(),
  workflow_step_number: z.number().int().positive().nullable().optional(),
});

// ==================== Common Schemas ====================

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

// Type exports for use in edge functions
export type WorkflowExecutorRequest = z.infer<typeof WorkflowExecutorRequestSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;
export type GenerateCaptionRequest = z.infer<typeof GenerateCaptionRequestSchema>;
export type CaptionResponse = z.infer<typeof CaptionResponseSchema>;
export type GenerateContentRequest = z.infer<typeof GenerateContentRequestSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type User = z.infer<typeof UserSchema>;
export type GenerationRecord = z.infer<typeof GenerationRecordSchema>;
