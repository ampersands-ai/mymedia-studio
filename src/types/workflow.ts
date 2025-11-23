import { z } from 'zod';

/**
 * Workflow execution schemas and types
 */
export const WorkflowExecutionParamsSchema = z.object({
  workflow_template_id: z.string().uuid(),
  user_inputs: z.record(z.unknown()),
});

export type WorkflowExecutionParams = z.infer<typeof WorkflowExecutionParamsSchema>;

export const WorkflowExecutionResultSchema = z.object({
  execution_id: z.string().uuid(),
  status: z.string(),
  final_output_url: z.string().url().nullable(),
  tokens_used: z.number().nonnegative(),
});

export type WorkflowExecutionResult = z.infer<typeof WorkflowExecutionResultSchema>;

export const WorkflowExecutionStateSchema = z.object({
  id: z.string(),
  status: z.string(),
  current_step: z.number().optional(),
  total_steps: z.number().optional(),
  final_output_url: z.string().optional(),
  tokens_used: z.number().optional(),
  error_message: z.string().optional(),
});

export type WorkflowExecutionState = z.infer<typeof WorkflowExecutionStateSchema>;

export const WorkflowProgressSchema = z.object({
  currentStep: z.number(),
  totalSteps: z.number(),
  stepName: z.string().optional(),
});

export type WorkflowProgress = z.infer<typeof WorkflowProgressSchema>;

/**
 * Workflow template schemas
 */
export const WorkflowStepSchema = z.object({
  step_order: z.number(),
  step_type: z.string(),
  step_config: z.record(z.unknown()),
});

export const UserInputFieldSchema = z.object({
  field_name: z.string(),
  field_type: z.string(),
  required: z.boolean().optional(),
  default_value: z.unknown().optional(),
});

export const MergedTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  template_type: z.enum(['template', 'workflow']),
  is_active: z.boolean(),
  // Common fields
  description: z.string().optional(),
  thumbnail_url: z.string().optional(),
  before_image_url: z.string().optional(),
  after_image_url: z.string().optional(),
  display_order: z.number().optional(),
  estimated_time_seconds: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  // Content template fields
  model_id: z.string().optional(),
  user_editable_fields: z.unknown().optional(),
  hidden_field_defaults: z.unknown().optional(),
  preset_parameters: z.unknown().optional(),
  enhancement_instruction: z.string().optional(),
  is_custom_model: z.boolean().optional(),
  // Client-side enriched model metadata from registry (NOT from database)
  // Populated by frontend hooks using model_record_id from workflow steps
  ai_models: z.object({
    id: z.string(),
    name: z.string(),
    base_token_cost: z.number(),
    content_type: z.string().optional(),
  }).optional(),
  // Workflow template fields
  workflow_steps: z.unknown().optional(),
  user_input_fields: z.unknown().optional(),
});

export type MergedTemplate = z.infer<typeof MergedTemplateSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type UserInputField = z.infer<typeof UserInputFieldSchema>;

/**
 * Dialog state schemas for admin workflows
 */
export const ContentTemplateDialogStateSchema = z.object({
  open: z.boolean(),
  template: z.any().nullable(),
});

export const WorkflowDialogStateSchema = z.object({
  open: z.boolean(),
  workflow: z.any().nullable(),
  isNew: z.boolean(),
});

export type ContentTemplateDialogState = z.infer<typeof ContentTemplateDialogStateSchema>;
export type WorkflowDialogState = z.infer<typeof WorkflowDialogStateSchema>;
