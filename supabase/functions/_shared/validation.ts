import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { EdgeLogger } from './edge-logger.ts';

// ========================================
// COMMON VALIDATION SCHEMAS
// ========================================

export const CommonSchemas = {
  // Identifiers
  uuid: z.string().uuid('Invalid UUID format'),
  recordId: z.string().min(1, 'Record ID required'),
  
  // Text fields
  nonEmptyString: z.string().min(1, 'Cannot be empty').transform(s => s.trim()),
  email: z.string().email('Invalid email format'),
  url: z.string().url('Invalid URL format'),
  
  // Prompts and content
  promptText: z.string()
    .min(3, 'Prompt must be at least 3 characters')
    .max(5000, 'Prompt cannot exceed 5000 characters')
    .transform(s => s.trim()),
  
  shortPrompt: z.string()
    .min(1, 'Prompt required')
    .max(500, 'Prompt cannot exceed 500 characters')
    .transform(s => s.trim()),
  
  // Model identifiers
  modelId: z.string()
    .regex(/^[a-z0-9-/]+$/, 'Invalid model ID format')
    .min(1, 'Model ID required'),
  
  // Numbers
  positiveNumber: z.number().positive('Must be positive'),
  positiveInteger: z.number().int().positive('Must be positive integer'),
  tokens: z.number().min(0.1).max(10000, 'Tokens must be between 0.1 and 10000'),
  percentage: z.number().min(0).max(100, 'Must be between 0 and 100'),
  
  // Dates
  isoDate: z.string().datetime('Invalid ISO date format'),
  
  // Status enums
  generationStatus: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  videoStatus: z.enum(['pending', 'processing', 'rendering', 'completed', 'failed']),
  storyboardStatus: z.enum(['draft', 'rendering', 'complete', 'failed']),
  
  // Custom parameters
  customParameters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
};

// ========================================
// REQUEST SCHEMAS
// ========================================

/**
 * Schema for generate-content edge function
 */
export const GenerateContentSchema = z.object({
  model_id: CommonSchemas.modelId,
  model_record_id: CommonSchemas.uuid,
  prompt: CommonSchemas.promptText.optional(), // Optional - validated against schema later
  custom_parameters: CommonSchemas.customParameters,
  template_id: CommonSchemas.uuid.optional(),
  enhance_prompt: z.boolean().default(false),
  user_id: CommonSchemas.uuid.optional(), // For service role calls
});

export type GenerateContentRequest = z.infer<typeof GenerateContentSchema>;

/**
 * Schema for webhook payloads
 */
export const WebhookPayloadSchema = z.object({
  task_id: CommonSchemas.nonEmptyString,
  status: z.enum(['pending', 'completed', 'failed']),
  output_url: CommonSchemas.url.optional(),
  error_message: z.string().optional(),
  provider_response: z.record(z.unknown()).optional(),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

/**
 * Schema for test-model edge function
 */
export const TestModelSchema = z.object({
  model_id: CommonSchemas.modelId,
  test_prompt: CommonSchemas.promptText,
  custom_parameters: CommonSchemas.customParameters,
});

export type TestModelRequest = z.infer<typeof TestModelSchema>;

/**
 * Schema for workflow-executor
 */
export const WorkflowExecutorSchema = z.object({
  template_id: CommonSchemas.uuid,
  user_input: z.record(z.unknown()),
});

export type WorkflowExecutorRequest = z.infer<typeof WorkflowExecutorSchema>;

/**
 * Schema for cancel-generation
 */
export const CancelGenerationSchema = z.object({
  generation_id: CommonSchemas.uuid,
});

export type CancelGenerationRequest = z.infer<typeof CancelGenerationSchema>;

/**
 * Schema for render-storyboard-video edge function
 */
export const RenderStoryboardVideoSchema = z.object({
  storyboardId: CommonSchemas.uuid,
  confirmRerender: z.boolean().optional(),
});

export type RenderStoryboardVideoRequest = z.infer<typeof RenderStoryboardVideoSchema>;

/**
 * Schema for poll-storyboard-status edge function
 */
export const PollStoryboardStatusSchema = z.object({
  storyboardId: CommonSchemas.uuid,
});

export type PollStoryboardStatusRequest = z.infer<typeof PollStoryboardStatusSchema>;

/**
 * Schema for regenerate-storyboard-scene edge function
 */
export const RegenerateStoryboardSceneSchema = z.object({
  storyboardId: CommonSchemas.uuid,
  sceneId: CommonSchemas.uuid,
  previousSceneText: z.string().optional(),
  nextSceneText: z.string().optional(),
});

export type RegenerateStoryboardSceneRequest = z.infer<typeof RegenerateStoryboardSceneSchema>;

/**
 * Schema for delete-storyboard edge function
 */
export const DeleteStoryboardSchema = z.object({
  storyboardId: CommonSchemas.uuid,
});

export type DeleteStoryboardRequest = z.infer<typeof DeleteStoryboardSchema>;

/**
 * Schema for approve-script edge function
 */
export const ApproveScriptSchema = z.object({
  job_id: CommonSchemas.uuid,
  edited_script: z.string().optional(),
});

export type ApproveScriptRequest = z.infer<typeof ApproveScriptSchema>;

/**
 * Schema for extend-session edge function
 */
export const ExtendSessionSchema = z.object({}).optional();

export type ExtendSessionRequest = z.infer<typeof ExtendSessionSchema>;

/**
 * Schema for approve-voiceover
 */
export const ApproveVoiceoverSchema = z.object({
  voiceover_id: CommonSchemas.uuid,
  approved: z.boolean(),
  rejection_reason: z.string().optional(),
});

export type ApproveVoiceoverRequest = z.infer<typeof ApproveVoiceoverSchema>;

/**
 * Schema for create-video-job
 */
export const CreateVideoJobSchema = z.object({
  prompt: CommonSchemas.promptText,
  voice_id: CommonSchemas.uuid.optional(),
  music_prompt: CommonSchemas.shortPrompt.optional(),
  custom_parameters: CommonSchemas.customParameters,
});

export type CreateVideoJobRequest = z.infer<typeof CreateVideoJobSchema>;

/**
 * Schema for manual-fail operations
 */
export const ManualFailSchema = z.object({
  generation_ids: z.array(CommonSchemas.uuid).optional(),
  video_job_ids: z.array(CommonSchemas.uuid).optional(),
});

export type ManualFailRequest = z.infer<typeof ManualFailSchema>;

/**
 * Schema for token management
 */
export const TokenManagementSchema = z.object({
  user_id: CommonSchemas.uuid,
  amount: CommonSchemas.positiveNumber,
  action: z.enum(['add', 'deduct']),
});

export type TokenManagementRequest = z.infer<typeof TokenManagementSchema>;

/**
 * Schema for role management
 */
export const RoleManagementSchema = z.object({
  user_id: CommonSchemas.uuid,
  role: z.enum(['admin', 'moderator', 'user']),
  action: z.enum(['grant', 'revoke']),
});

export type RoleManagementRequest = z.infer<typeof RoleManagementSchema>;

// ========================================
// VALIDATION UTILITIES
// ========================================

/**
 * Validation result type
 */
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: z.ZodError; formattedErrors: Record<string, string[]> };

/**
 * Validate request data against a Zod schema with structured logging
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param logger - Optional logger for validation failures
 * @param context - Optional context string for logging
 * @returns Validation result with typed data or formatted errors
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  logger?: EdgeLogger,
  context?: string
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const rawErrors = result.error.flatten().fieldErrors;
    // Filter out undefined values to satisfy type constraints
    const formattedErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(rawErrors)) {
      if (Array.isArray(value)) {
        formattedErrors[key] = value;
      }
    }

    if (logger) {
      logger.warn('Request validation failed', {
        metadata: {
          context: context || 'unknown',
          errors: formattedErrors,
          receivedData: typeof data === 'object' ? Object.keys(data as Record<string, unknown>) : typeof data
        }
      });
    }

    return {
      success: false,
      error: result.error,
      formattedErrors
    };
  }
  
  if (logger) {
    logger.debug('Request validation successful', {
      metadata: { context: context || 'unknown' }
    });
  }
  
  return { success: true, data: result.data };
}

/**
 * Middleware wrapper for validation - throws on validation failure
 * Use in edge functions that need to halt execution on invalid input
 * 
 * @param schema - Zod schema to validate against
 * @param logger - Logger instance for validation logging
 * @returns Async function that validates and returns typed data or throws
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  logger: EdgeLogger
) {
  return async (data: unknown, context?: string): Promise<T> => {
    const result = validateRequest(schema, data, logger, context);
    
    if (!result.success) {
      throw new Error(JSON.stringify({
        error: 'Validation failed',
        details: result.formattedErrors
      }));
    }
    
    return result.data;
  };
}

// ========================================
// HEADER UTILITIES
// ========================================

/**
 * Convert HeadersInit to Record<string, string>
 */
export function normalizeHeaders(headers: HeadersInit): Record<string, string> {
  if (headers instanceof Headers) {
    const normalized: Record<string, string> = {};
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }
  if (Array.isArray(headers)) {
    const normalized: Record<string, string> = {};
    headers.forEach(([key, value]) => {
      normalized[key] = value;
    });
    return normalized;
  }
  return headers as Record<string, string>;
}

/**
 * Create a standardized validation error response
 */
export function createValidationErrorResponse(
  formattedErrors: Record<string, string[]>,
  headers: HeadersInit
): Response {
  const normalizedHeaders = normalizeHeaders(headers);
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      details: formattedErrors
    }),
    { 
      status: 400,
      headers: {
        ...normalizedHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}
