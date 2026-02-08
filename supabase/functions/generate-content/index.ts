/**
 * GENERATE CONTENT EDGE FUNCTION
 * ================================
 * Modular architecture - see handlers/ and services/ for implementation details.
 * 
 * Structure:
 * - handlers/validation.ts - Request validation, auth, rate limits
 * - handlers/sync-handler.ts - Synchronous generation flow
 * - handlers/async-handler.ts - Webhook-based async flow
 * - services/credit-service.ts - Token operations
 * - services/storage-service.ts - File uploads
 * - services/audit-service.ts - Audit logging
 * - services/prompt-enhancement.ts - AI prompt enhancement
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { TestExecutionLogger } from "../_shared/test-execution-logger.ts";
import { callProvider } from "./providers/index.ts";
import { isProviderRequest } from "../_shared/provider-types.ts";
import { calculateTokenCost } from "./utils/token-calculator.ts";
import { convertImagesToUrls } from "./utils/image-processor.ts";
import { validateGenerationSettingsWithSchema } from "../_shared/jsonb-validation-schemas.ts";
import { SYSTEM_LIMITS } from "../_shared/constants.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rate-limit-middleware.ts";
import { withCircuitBreaker } from "../_shared/circuit-breaker-enhanced.ts";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { alertHighError } from "../_shared/admin-alerts.ts";

// Import modular handlers and services
import {
  authenticateUser,
  checkEmailVerification,
  validateRequestBody,
  checkRateLimits,
  transformModelConfig,
  validateAndFilterParameters,
  coerceParametersBySchema,
  normalizeParameterKeys,
  detectBase64Images,
  analyzePromptField,
  normalizeContentType,
  API_CONTROL_PARAMS,
  type EdgeFunctionUser,
  type Model
} from "./handlers/validation.ts";
import { deductTokens, refundTokens } from "./services/credit-service.ts";
import { logTokenEvent, logGenerationEvent, markGenerationFailed } from "./services/audit-service.ts";
import { isWebhookProvider, saveProviderTaskId, buildAsyncResponse } from "./handlers/async-handler.ts";
import { processBackgroundUpload, buildSyncResponse } from "./handlers/sync-handler.ts";
import { enhancePrompt } from "./services/prompt-enhancement.ts";

// Circuit breaker state
const CIRCUIT_BREAKER = {
  failures: 0,
  threshold: 10,
  timeout: 60000,
  lastFailure: 0
};

// Request queue tracking
const CONCURRENT_LIMIT = SYSTEM_LIMITS.CONCURRENT_REQUESTS;
const activeRequests = new Map<string, Promise<unknown>>();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const responseHeaders = getResponseHeaders(req);
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting
    const rateLimitResponse = await applyRateLimit(req, 'generation', 'generate-content');
    if (rateLimitResponse) return rateLimitResponse;

    // Queue capacity check
    if (activeRequests.size >= CONCURRENT_LIMIT) {
      return new Response(
        JSON.stringify({ error: 'System at capacity. Please try again in a moment.' }),
        { status: 503, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const logger = new EdgeLogger('generate-content', requestId, supabase, true);

    // Authentication
    const { user: initialUser, isServiceRole } = await authenticateUser(req, supabase, logger);

    // Validate request body
    const requestBody = await req.json();
    const validationResult = validateRequestBody(requestBody, logger, responseHeaders);
    if (!validationResult.success) return validationResult.response;

    const validatedRequest = validationResult.data;
    const {
      generationId: existingGenerationId,
      model_config,
      model_schema,
      custom_parameters = {},
      enhance_prompt = false,
      enhancement_provider = 'lovable_ai',
      workflow_execution_id,
      workflow_step_number,
      user_id,
      test_mode = false,
      test_run_id,
      blackboard_scene_id,
    } = validatedRequest;

    let { prompt } = validatedRequest;

    // Handle service role authentication
    let user: EdgeFunctionUser | null = initialUser;
    if (isServiceRole) {
      if (!user_id) throw new Error('user_id required when using service role authentication');
      user = { id: user_id };
      logger.info('Service role detected - using user_id from request', { metadata: { user_id } });
    }

    if (!user) throw new Error('User authentication required');
    const authenticatedUser = user;

    // Email verification check (skip for service role)
    if (!isServiceRole) {
      const emailCheckResponse = await checkEmailVerification(supabase, authenticatedUser.id, logger, responseHeaders);
      if (emailCheckResponse) return emailCheckResponse;
    }

    // Test mode verification
    let isTestMode = false;
    let testLogger: TestExecutionLogger | null = null;
    if (test_mode && isServiceRole) {
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authenticatedUser.id)
        .eq('role', 'admin')
        .single();

      if (adminRole) {
        isTestMode = true;
        logger.info('TEST_MODE: Non-billable test run for admin user', { userId: authenticatedUser.id });
        testLogger = new TestExecutionLogger(supabase, test_run_id || null, true);
      }
    }

    // Validate model config requirement
    if (!model_config || !model_schema) {
      throw new Error('model_config and model_schema are REQUIRED.');
    }

    const model = transformModelConfig(model_config, model_schema);
    logger.info('Using model config from .ts registry', {
      userId: authenticatedUser.id,
      metadata: { model_id: model.id, record_id: model.record_id, provider: model.provider }
    });

    // Prepare parameters
    let parameters: Record<string, unknown> = custom_parameters;
    
    // Check if storyboard defaults are being used (skip schema default injection)
    const useStoryboardDefaults = parameters.__useStoryboardDefaults === true;
    if (useStoryboardDefaults) {
      delete parameters.__useStoryboardDefaults;
      logger.info('Using storyboard defaults - skipping schema default injection', {
        userId: authenticatedUser.id,
        metadata: { parameter_keys: Object.keys(parameters) }
      });
    }
    
    if (parameters.input && typeof parameters.input === 'object' && !Array.isArray(parameters.input)) {
      const inputParams = parameters.input as Record<string, unknown>;
      const { model: _model, input: _input, ...otherTopLevel } = parameters;
      parameters = { ...inputParams, ...otherTopLevel };
    }

    parameters = normalizeParameterKeys(parameters);

    // Prompt field analysis
    const { hasPromptField, promptFieldName, promptRequired } = analyzePromptField(model.input_schema);

    // Extract prompt from parameters if needed
    if (!prompt && hasPromptField && promptFieldName && parameters[promptFieldName]) {
      prompt = String(parameters[promptFieldName]);
      delete parameters[promptFieldName];
    }

    // Rate limit checks (skip for test mode)
    if (!isTestMode) {
      const rateLimitResponse = await checkRateLimits(supabase, authenticatedUser.id, existingGenerationId, logger, responseHeaders);
      if (rateLimitResponse) return rateLimitResponse;
    }

    // Prompt enhancement
    let finalPrompt = prompt || "";
    const originalPrompt = prompt || "";
    let usedEnhancementProvider = null;

    if (hasPromptField && prompt && enhance_prompt) {
      try {
        const enhancementResult = await enhancePrompt(
          prompt, null, enhancement_provider, model.content_type, model.provider,
          Boolean(parameters.customMode)
        );
        finalPrompt = enhancementResult.enhanced;
        usedEnhancementProvider = enhancementResult.provider;
        logger.info('Prompt enhanced successfully', { userId: authenticatedUser.id, metadata: { provider: usedEnhancementProvider } });
      } catch {
        // Continue with original prompt
      }
    }

    // Parameter validation - skip schema defaults for storyboard requests
    const isPreparedRunwarePayload = model.provider === 'runware' &&
      typeof parameters?.taskType === 'string' && typeof parameters?.model === 'string' &&
      (parameters?.width !== undefined || parameters?.height !== undefined);

    // For storyboard defaults, skip schema default injection entirely
    const skipSchemaDefaults = useStoryboardDefaults || isPreparedRunwarePayload;

    let validatedParameters = validateAndFilterParameters(
      parameters, model.input_schema || { properties: {}, required: [] },
      { applyDefaults: !skipSchemaDefaults }, logger
    );
    validatedParameters = coerceParametersBySchema(validatedParameters, model.input_schema || { properties: {} });

    // Calculate token cost - prefer preCalculatedCost, fallback to deprecated 'cost', then calculate
    // Log warning if deprecated 'cost' field is used
    if (validatedRequest.cost && !validatedRequest.preCalculatedCost) {
      logger.warn('Deprecated "cost" field used - migrate to "preCalculatedCost"', {
        userId: authenticatedUser.id,
        metadata: { model_id: model.id, cost: validatedRequest.cost }
      });
    }
    const tokenCost = validatedRequest.preCalculatedCost ?? validatedRequest.cost ?? calculateTokenCost(
      model.base_token_cost, model.cost_multipliers || {}, validatedParameters
    );

    // Transaction-like token deduction + generation creation
    let tokensDeducted = false;
    let generationCreated = false;
    let generation: { id: string; user_id: string; model_id: string; status: string; settings?: Record<string, unknown>; [key: string]: unknown } | null = null;

    try {
      // Deduct tokens (skip for test mode)
      if (!isTestMode) {
        const deductResult = await deductTokens(supabase, authenticatedUser.id, tokenCost, logger, responseHeaders);
        if (!deductResult.success) return deductResult.response;
        tokensDeducted = true;
        await logTokenEvent(supabase, authenticatedUser.id, 'tokens_deducted', tokenCost, deductResult.newBalance, model.id);
      }

      const webhookToken = crypto.randomUUID();
      detectBase64Images(parameters, logger, authenticatedUser.id, model.id, model.provider);

      // Validate settings
      const settingsToValidate = { ...parameters, prompt: finalPrompt, _webhook_token: webhookToken };
      const settingsValidation = validateGenerationSettingsWithSchema(settingsToValidate, model.input_schema);
      if (!settingsValidation.success) throw new Error(`Invalid generation settings: ${settingsValidation.error}`);

      const generationSettings = settingsValidation.data as Record<string, unknown>;

      // Create or update generation record
      let gen: unknown, genError: unknown;
      if (existingGenerationId) {
        // First fetch existing settings to preserve video_job_id and other fields
        const { data: existingGen } = await supabase.from('generations')
          .select('settings')
          .eq('id', existingGenerationId)
          .single();
        
        const mergedSettings = {
          ...(existingGen?.settings as Record<string, unknown> || {}),
          ...generationSettings,
        };
        
        const { data, error } = await supabase.from('generations')
          .update({ model_id: model.id, model_record_id: model.record_id, type: normalizeContentType(model.content_type), prompt: finalPrompt, original_prompt: originalPrompt, enhanced_prompt: enhance_prompt ? finalPrompt : null, enhancement_provider: usedEnhancementProvider, settings: mergedSettings, tokens_used: tokenCost, actual_token_cost: tokenCost, status: 'pending' })
          .eq('id', existingGenerationId).eq('user_id', authenticatedUser.id).select().single();
        gen = data; genError = error;
      }
      if (!existingGenerationId || genError) {
        const { data, error } = await supabase.from('generations')
          .insert({ user_id: authenticatedUser.id, model_id: model.id, model_record_id: model.record_id, type: normalizeContentType(model.content_type), prompt: finalPrompt, original_prompt: originalPrompt, enhanced_prompt: enhance_prompt ? finalPrompt : null, enhancement_provider: usedEnhancementProvider, settings: generationSettings, tokens_used: tokenCost, actual_token_cost: tokenCost, status: 'pending', workflow_execution_id: workflow_execution_id || null, workflow_step_number: workflow_step_number || null, blackboard_scene_id: blackboard_scene_id || null })
          .select().single();
        gen = data; genError = error;
      }

      if (genError || !gen) throw new Error(`Failed to create generation record`);
      generation = gen as typeof generation;
      generationCreated = true;

      // Prompt validation
      if (hasPromptField && promptRequired && (!prompt || prompt.trim() === '')) throw new Error('Prompt is required for this model');
      if (prompt) {
        if (prompt.length < 3) {
          throw new Error('Prompt must be at least 3 characters');
        }
        // Get model-specific limit from schema, fallback to 10000
        const maxPromptLength = (model.input_schema?.properties?.prompt as { maxLength?: number })?.maxLength || 10000;
        if (prompt.length > maxPromptLength) {
          throw new Error(`Prompt too long: ${prompt.length.toLocaleString()}/${maxPromptLength.toLocaleString()} characters`);
        }
      }

    } catch (txError) {
      if (generationCreated && generation) {
        await markGenerationFailed(supabase, generation.id, txError instanceof Error ? txError.message : 'Validation failed');
      }
      if (tokensDeducted && !isTestMode) await refundTokens(supabase, authenticatedUser.id, tokenCost, logger, 'validation_error');
      return new Response(JSON.stringify({ error: txError instanceof Error ? txError.message : 'Validation failed' }), { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
    }

    const createdGeneration = generation!;

    // Circuit breaker check
    if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER.threshold) {
      const elapsed = Date.now() - CIRCUIT_BREAKER.lastFailure;
      if (elapsed < CIRCUIT_BREAKER.timeout) {
        if (!isTestMode) await refundTokens(supabase, authenticatedUser.id, tokenCost, logger, 'circuit_breaker');
        return new Response(JSON.stringify({ error: 'Provider temporarily unavailable.', retry_after_seconds: Math.ceil((CIRCUIT_BREAKER.timeout - elapsed) / 1000) }), { status: 503, headers: { ...responseHeaders, 'Content-Type': 'application/json' } });
      }
      CIRCUIT_BREAKER.failures = 0;
    }

    // Provider call
    const requestPromise = (async () => {
      let providerRequest: Record<string, unknown> | null = null;
      try {
        const parametersWithPrompt = { ...validatedParameters };
        if (hasPromptField && finalPrompt && promptFieldName) parametersWithPrompt[promptFieldName] = finalPrompt;

        const processedParams = await convertImagesToUrls(parametersWithPrompt, authenticatedUser.id, supabase, logger);
        providerRequest = { model: model.id, model_record_id: model.record_id, parameters: processedParams, input_schema: model.input_schema, api_endpoint: model.api_endpoint, payload_structure: model.payload_structure || 'wrapper', userId: authenticatedUser.id, generationId: createdGeneration.id };

        if (!isProviderRequest(providerRequest)) throw new Error('Invalid provider request structure');

        const webhookToken = createdGeneration.settings?._webhook_token as string | undefined;
        await supabase.from('generations').update({ api_call_started_at: new Date().toISOString() }).eq('id', createdGeneration.id);

        const providerResponse = await withCircuitBreaker(`provider_${model.provider}`, 'ai_provider', () => callProvider(model.provider, providerRequest!, webhookToken), supabase) as Record<string, unknown>;

        // Handle async webhook providers
        if (isWebhookProvider(model.provider, providerResponse as { metadata?: { task_id?: string } })) {
          const taskId = (providerResponse.metadata as { task_id?: string })?.task_id!;
          const saveResult = await saveProviderTaskId(supabase, createdGeneration.id, taskId, providerRequest, providerResponse.metadata as Record<string, unknown>, authenticatedUser.id, tokenCost, isTestMode, logger, model);
          if (!saveResult.success) throw new Error(saveResult.error);
          return buildAsyncResponse(createdGeneration.id, tokenCost, model.content_type, !!(enhance_prompt), responseHeaders);
        }

        // Sync flow - process in background
        processBackgroundUpload({
          supabase, logger, testLogger, userId: authenticatedUser.id, generationId: createdGeneration.id,
          model, tokenCost, startTime, providerRequest,
          providerResponse: providerResponse as { storage_path?: string; output_data?: Uint8Array; file_extension?: string; file_size?: number; metadata?: Record<string, unknown> }
        });

        CIRCUIT_BREAKER.failures = 0;
        return buildSyncResponse(createdGeneration.id, tokenCost, model.content_type, !!(enhance_prompt), responseHeaders);

      } catch (providerError) {
        CIRCUIT_BREAKER.failures++;
        CIRCUIT_BREAKER.lastFailure = Date.now();
        await supabase.from('generations').update({ status: 'failed', tokens_used: 0, provider_request: providerRequest, provider_response: { error: (providerError instanceof Error ? providerError.message : String(providerError)).substring(0, 200), timestamp: new Date().toISOString() } }).eq('id', createdGeneration.id);
        if (!isTestMode) await refundTokens(supabase, authenticatedUser.id, tokenCost, logger, 'provider_error');
        await logGenerationEvent(supabase, authenticatedUser.id, createdGeneration.id, 'generation_failed', { modelId: model.id, tokensRefunded: tokenCost, error: providerError instanceof Error ? providerError.message : 'Unknown', durationMs: Date.now() - startTime });
        throw providerError;
      }
    })();

    activeRequests.set(requestId, requestPromise);
    try { return await requestPromise as Response; } finally { activeRequests.delete(requestId); }

  } catch (error) {
    // Send admin alert for generation errors
    alertHighError('generate-content', error instanceof Error ? error : new Error(String(error)), undefined, {
      requestId,
      durationMs: Date.now() - startTime,
    });
    return createSafeErrorResponse(error, 'generate-content', responseHeaders);
  }
});
