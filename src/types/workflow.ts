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
  // Content template fields
  model_id: z.string().optional(),
  user_editable_fields: z.record(z.unknown()).optional(),
  hidden_field_defaults: z.record(z.unknown()).optional(),
  preset_parameters: z.record(z.unknown()).optional(),
  // Workflow template fields
  workflow_steps: z.array(WorkflowStepSchema).optional(),
  user_input_fields: z.array(UserInputFieldSchema).optional(),
});

export type MergedTemplate = z.infer<typeof MergedTemplateSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type UserInputField = z.infer<typeof UserInputFieldSchema>;

/**
 * Dialog state schemas for admin workflows
 */
export const ContentTemplateDialogStateSchema = z.object({
  open: z.boolean(),
  template: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    model_id: z.string().optional(),
    user_editable_fields: z.record(z.unknown()),
    hidden_field_defaults: z.record(z.unknown()),
    preset_parameters: z.record(z.unknown()).optional(),
  }).nullable(),
});

export const WorkflowDialogStateSchema = z.object({
  open: z.boolean(),
  workflow: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    workflow_steps: z.array(WorkflowStepSchema),
    user_input_fields: z.array(UserInputFieldSchema),
  }).nullable(),
});

export type ContentTemplateDialogState = z.infer<typeof ContentTemplateDialogStateSchema>;
export type WorkflowDialogState = z.infer<typeof WorkflowDialogStateSchema>;
