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
  hashtags: z.array(z.string().regex(/^#/, "Hashtags must start with #"))
    .length(15, "Must have exactly 15 hashtags"),
});

export const AIToolCallSchema = z.object({
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

// ==================== Generate Content Schemas ====================

export const GenerateContentRequestSchema = z.object({
  template_id: z.string().uuid().optional(),
  model_id: z.string().optional(),
  model_record_id: z.string().uuid().optional(),
  prompt: z.string().optional(),
  custom_parameters: z.record(z.unknown()).default({}),
  enhance_prompt: z.boolean().default(false),
  enhancement_provider: z.enum(['lovable_ai', 'openai']).default('lovable_ai'),
  workflow_execution_id: z.string().uuid().optional(),
  workflow_step_number: z.number().int().positive().optional(),
  user_id: z.string().uuid().optional(),
  test_mode: z.boolean().default(false),
}).refine(
  (data) => {
    const hasTemplate = Boolean(data.template_id);
    const hasModel = Boolean(data.model_id || data.model_record_id);
    return (hasTemplate && !hasModel) || (!hasTemplate && hasModel);
  },
  { message: "Must provide either template_id or model_id/model_record_id, not both" }
);

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

export const TemplateSchema = z.object({
  id: z.string().uuid(),
  preset_parameters: z.record(z.unknown()).optional(),
  enhancement_instruction: z.string().nullable().optional(),
  ai_models: ModelSchema,
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
});

export const GenerationRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  provider_generation_id: z.string().nullable().optional(),
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
export type Template = z.infer<typeof TemplateSchema>;
export type User = z.infer<typeof UserSchema>;
export type GenerationRecord = z.infer<typeof GenerationRecordSchema>;
