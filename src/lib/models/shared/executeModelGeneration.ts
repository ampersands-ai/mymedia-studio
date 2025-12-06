/**
 * Shared Model Execution Utility
 *
 * This utility provides a standardized execution flow for all AI models,
 * eliminating duplicate code across 71 model files.
 *
 * @module executeModelGeneration
 */

import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";
import { GENERATION_STATUS } from "@/constants/generation-status";
import { sanitizeForStorage } from "@/lib/database/sanitization";
import { assertNoBase64Images } from "@/lib/validation/imageValidation";

/**
 * Model configuration for execution
 */
export interface ModelConfig {
  modelId: string;
  recordId: string;
  contentType: string;
  [key: string]: unknown;
}

/**
 * Model schema definition
 */
export interface ModelSchema {
  properties: Record<string, unknown>;
  required?: string[] | readonly string[];
  type: string;
  [key: string]: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Model functions interface
 */
export interface ModelFunctions {
  validate: (inputs: Record<string, any>) => ValidationResult;
  calculateCost: (inputs: Record<string, any>) => number;
  preparePayload: (inputs: Record<string, any>) => Record<string, any>;
}

/**
 * Shared execution options
 */
export interface ExecuteOptions {
  /** Model configuration */
  modelConfig: ModelConfig;
  /** Model schema */
  modelSchema: ModelSchema;
  /** Model-specific functions */
  modelFunctions: ModelFunctions;
  /** Execution parameters */
  params: ExecuteGenerationParams;
  /** Input field name for prompt (default: 'prompt') */
  promptField?: string;
}

/**
 * Execute model generation with standardized flow
 *
 * This function:
 * 1. Validates inputs using model's validate function
 * 2. Calculates cost using model's calculateCost function
 * 3. Reserves credits for the user
 * 4. Creates generation record in database
 * 5. Invokes edge function for server-side API call
 * 6. Starts polling for results
 * 7. Returns generation ID
 *
 * @param options - Execution options
 * @returns Generation ID
 * @throws Error if validation fails, credit reservation fails, or edge function fails
 *
 * @example
 * ```typescript
 * export async function execute(params: ExecuteGenerationParams): Promise<string> {
 *   return executeModelGeneration({
 *     modelConfig: MODEL_CONFIG,
 *     modelSchema: SCHEMA,
 *     modelFunctions: { validate, calculateCost, preparePayload },
 *     params
 *   });
 * }
 * ```
 */
export async function executeModelGeneration(options: ExecuteOptions): Promise<string> {
  const {
    modelConfig,
    modelSchema,
    modelFunctions,
    params,
    promptField = 'prompt'
  } = options;

  const { prompt, modelParameters, userId, startPolling } = params;

  // Build inputs object with prompt and parameters
  const inputs: Record<string, any> = {
    [promptField]: prompt,
    ...modelParameters
  };

  // 1. Validate inputs
  const validation = modelFunctions.validate(inputs);
  if (!validation.valid) {
    throw new Error(validation.error || 'Validation failed');
  }

  // 2. Calculate cost
  const cost = modelFunctions.calculateCost(inputs);

  // 3. Reserve credits
  await reserveCredits(userId, cost);

  // 4. Create generation record
  const { data: gen, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      model_id: modelConfig.modelId,
      model_record_id: modelConfig.recordId,
      type: getGenerationType(modelConfig.contentType),
      prompt,
      tokens_used: cost,
      status: GENERATION_STATUS.PENDING, // Edge function will process
      settings: sanitizeForStorage(modelParameters)
    })
    .select()
    .single();

  if (error || !gen) {
    throw new Error(`Failed to create generation record: ${error?.message || 'Unknown error'}`);
  }

  // 5. Prepare payload and validate no base64 images
  const payload = modelFunctions.preparePayload(inputs);
  
  // FAIL-SAFE: Assert no base64 images in payload before sending to edge function
  // This catches any missed cases where images weren't uploaded to storage
  assertNoBase64Images(
    payload, 
    `model: ${modelConfig.modelId}, generation: ${gen.id}`
  );

  // 6. Invoke edge function for server-side API call
  // This keeps API keys secure and avoids CORS issues
  const { error: funcError } = await supabase.functions.invoke('generate-content', {
    body: {
      generationId: gen.id,
      model_config: modelConfig,
      model_schema: modelSchema,
      prompt: inputs[promptField],
      custom_parameters: payload
    }
  });

  if (funcError) {
    // Mark generation as failed
    await supabase
      .from('generations')
      .update({ status: GENERATION_STATUS.FAILED })
      .eq('id', gen.id);

    throw new Error(`Edge function failed: ${funcError.message}`);
  }

  // 7. Start polling for results
  startPolling(gen.id);

  // 8. Return generation ID
  return gen.id;
}

/**
 * Execute model generation with custom prompt field
 *
 * Some models use 'positivePrompt' instead of 'prompt'
 *
 * @example
 * ```typescript
 * export async function execute(params: ExecuteGenerationParams): Promise<string> {
 *   return executeWithPromptField({
 *     modelConfig: MODEL_CONFIG,
 *     modelSchema: SCHEMA,
 *     modelFunctions: { validate, calculateCost, preparePayload },
 *     params,
 *     promptField: 'positivePrompt'
 *   });
 * }
 * ```
 */
export async function executeWithPromptField(
  options: Omit<ExecuteOptions, 'promptField'> & { promptField: string }
): Promise<string> {
  return executeModelGeneration(options);
}

/**
 * Create model functions from model exports
 *
 * Helper to create ModelFunctions object from standard model exports
 *
 * @example
 * ```typescript
 * const modelFunctions = createModelFunctions({ validate, calculateCost, preparePayload });
 * ```
 */
export function createModelFunctions(funcs: {
  validate: (inputs: Record<string, any>) => ValidationResult;
  calculateCost: (inputs: Record<string, any>) => number;
  preparePayload: (inputs: Record<string, any>) => Record<string, any>;
}): ModelFunctions {
  return funcs;
}
