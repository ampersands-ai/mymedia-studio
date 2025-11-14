import { z } from 'zod';

/**
 * Generation parameter schemas and types
 */
export const GenerationParamsSchema = z.object({
  template_id: z.string().uuid().optional(),
  model_id: z.string().optional(),
  model_record_id: z.string().uuid().optional(),
  prompt: z.string().optional(),
  custom_parameters: z.record(z.unknown()).optional(),
  enhance_prompt: z.boolean().optional(),
});

export type GenerationParams = z.infer<typeof GenerationParamsSchema>;

/**
 * Schema for async generation acknowledgments (202 responses)
 */
export const GenerationAckSchema = z.object({
  id: z.string().uuid(),
  generation_id: z.string().uuid().optional(),
  status: z.enum(['processing', 'pending']),
  tokens_used: z.number().nonnegative(),
  content_type: z.string(),
  enhanced: z.boolean(),
  is_async: z.literal(true),
  message: z.string().optional(),
});

/**
 * Schema for completed generation results (200 responses)
 */
export const GenerationResultSchema = z.object({
  id: z.string().uuid(),
  generation_id: z.string().uuid().optional(),
  output_url: z.string().url().optional(),
  storage_path: z.string().optional(),
  tokens_used: z.number().nonnegative(),
  status: z.string(),
  content_type: z.string(),
  enhanced: z.boolean(),
  is_async: z.boolean().optional(),
});

/**
 * Union type for handling both acknowledgments and complete results
 */
export const GenerationResponseSchema = z.union([
  GenerationResultSchema,
  GenerationAckSchema,
]);

export type GenerationAck = z.infer<typeof GenerationAckSchema>;
export type GenerationResult = z.infer<typeof GenerationResultSchema>;
export type GenerationResponse = z.infer<typeof GenerationResponseSchema>;

/**
 * Generation state schemas
 */
export const GenerationOutputSchema = z.object({
  id: z.string(),
  storage_path: z.string(),
  output_index: z.number(),
});

export const SelectedTemplateSchema = z.object({
  id: z.string(),
  model_id: z.string().optional(),
  name: z.string(),
  hidden_field_defaults: z.record(z.unknown()).optional(),
  preset_parameters: z.record(z.unknown()).optional(),
});

export const GenerationStateSchema = z.object({
  prompt: z.string(),
  selectedTemplate: SelectedTemplateSchema.nullable(),
  outputs: z.array(GenerationOutputSchema),
  currentOutput: z.string().nullable(),
  startTime: z.number().nullable(),
  completeTime: z.number().nullable(),
  pollingId: z.string().nullable(),
});

export type GenerationState = z.infer<typeof GenerationStateSchema>;
export type GenerationOutput = z.infer<typeof GenerationOutputSchema>;
export type SelectedTemplate = z.infer<typeof SelectedTemplateSchema>;

/**
 * Onboarding progress schema
 */
export const OnboardingProgressSchema = z.object({
  checklist: z.object({
    completedFirstGeneration: z.boolean(),
    downloadedImage: z.boolean().optional(),
    downloadedResult: z.boolean().optional(), // Legacy field
  }),
});

export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;

/**
 * Model and tokens schemas
 */
export const FilteredModelSchema = z.object({
  record_id: z.string(),
  base_token_cost: z.number(),
  cost_multipliers: z.record(z.unknown()).optional(),
});

export type FilteredModel = z.infer<typeof FilteredModelSchema>;

export const UserTokensSchema = z.object({
  tokens_remaining: z.number(),
});

export type UserTokens = z.infer<typeof UserTokensSchema>;

/**
 * Error types specific to generation
 */
export enum GenerationErrorCode {
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  PROMPT_TOO_SHORT = 'PROMPT_TOO_SHORT',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

export interface InsufficientCreditsError {
  type: 'INSUFFICIENT_CREDITS';
  message: string;
  required?: number;
  available?: number;
}
