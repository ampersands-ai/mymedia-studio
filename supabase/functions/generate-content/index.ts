import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { TestExecutionLogger } from "../_shared/test-execution-logger.ts";
import { callProvider } from "./providers/index.ts";
import { calculateTokenCost } from "./utils/token-calculator.ts";
import { uploadToStorage } from "./utils/storage.ts";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { convertImagesToUrls } from "./utils/image-processor.ts";
import {
  GenerateContentRequestSchema,
  type GenerateContentRequest
} from "../_shared/schemas.ts";
import { validateGenerationSettings } from "../_shared/jsonb-validation-schemas.ts";
import { GENERATION_STATUS, SYSTEM_LIMITS } from "../_shared/constants.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

/**
 * GENERATE CONTENT EDGE FUNCTION
 * ================================
 *
 * .TS REGISTRY ARCHITECTURE (Source of Truth)
 * --------------------------------------------
 * This edge function uses model definitions EXCLUSIVELY from .ts files.
 * Model data comes ONLY from file-based registry.
 *
 * HOW IT WORKS:
 * 1. Client loads model from .ts registry using getModel(recordId)
 * 2. Client sends REQUIRED model_config + model_schema to edge function
 * 3. Edge function uses provided config (NO DATABASE LOOKUP)
 * 4. Provider implementations route to external APIs
 *
 * MODEL-SPECIFIC LOGIC:
 * All model-specific parameter transformations (prompt->text, prompt->positivePrompt, etc.)
 * are handled in individual model .ts files via preparePayload() functions.
 * Each model knows its own requirements - providers are dumb transport layers.
 *
 * ADDING NEW MODELS:
 * - Create model .ts file in src/lib/models/locked/
 * - Define MODEL_CONFIG, SCHEMA, preparePayload(), execute()
 * - Register in src/lib/models/locked/index.ts
 * - Model automatically available (no database sync needed)
 *
 * Reference: ADR 007 - Locked Model Registry System
 */

// Type definitions
interface EdgeFunctionUser {
  id: string;
  email?: string;
}

interface GenerationResult {
  generationId: string;
  outputUrl?: string;
  status: string;
}

interface Model {
  id: string;
  record_id: string;
  provider: string;
  content_type: string;
  base_token_cost: number;
  cost_multipliers?: Record<string, number>;
  input_schema?: {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  api_endpoint?: string;
  payload_structure?: string;
}

// Phase 3: Request queuing and circuit breaker
// Increased from 100 to 750 for better scalability under high load
// Use centralized system limits configuration
const CONCURRENT_LIMIT = SYSTEM_LIMITS.CONCURRENT_REQUESTS;
const activeRequests = new Map<string, Promise<GenerationResult>>();

const CIRCUIT_BREAKER = {
  failures: 0,
  threshold: 10,
  timeout: 60000, // 1 minute
  lastFailure: 0
};

Deno.serve(async (req) => {
  // Handle CORS preflight with secure origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  // Get response headers (includes CORS + security headers)
  const responseHeaders = getResponseHeaders(req);

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Check request queue capacity
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

    // Authenticate user (allow service role for testing)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Check if using service role key (for test-model edge function)
    const isServiceRole = token === supabaseKey;
    
    let user: EdgeFunctionUser | null = null;
    if (isServiceRole) {
      logger.info('Service role authentication - test mode');
      user = null; // Will be set from request body
    } else {
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !userData.user) {
        logger.error('Authentication failed', authError || undefined);
        throw new Error('Unauthorized: Invalid user token');
      }
      user = { id: userData.user.id, email: userData.user.email };
    }

    // Validate request body with Zod
    const requestBody = await req.json();
    let validatedRequest: GenerateContentRequest;
    
    try {
      validatedRequest = GenerateContentRequestSchema.parse(requestBody);
    } catch (zodError: unknown) {
      const error = zodError instanceof Error ? zodError : new Error('Validation error');
      logger.error('Request validation failed', error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters',
          details: error.message
        }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const {
      model_config,  // REQUIRED: Full model config from .ts registry
      model_schema,  // REQUIRED: Model schema from .ts registry
      custom_parameters = {},
      enhance_prompt = false,
      enhancement_provider = 'lovable_ai',
      workflow_execution_id,
      workflow_step_number,
      user_id, // For service role calls (test mode)
      test_mode = false, // Flag to skip billing for admin tests
      test_run_id, // For linking test execution logs
    } = validatedRequest;

    let { prompt } = validatedRequest;
    
    // Schema-driven approach: NO hardcoded prompt extraction
    // Prompt should be provided at top level or remain in custom_parameters
    // The schema validation will handle whether prompts are required
    
    // If service role, require user_id in body
    if (isServiceRole) {
      if (!user_id) {
        throw new Error('user_id required when using service role authentication');
      }
      user = { id: user_id };
      logger.info('Service role detected - using user_id from request', { metadata: { user_id } });
    }

    // Type assertion for non-null user after authentication check
    if (!user) {
      throw new Error('User authentication required');
    }
    const authenticatedUser = user; // Now guaranteed non-null

    // Verify admin status for test_mode
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

        // Initialize test execution logger for comprehensive tracking
        testLogger = new TestExecutionLogger(
          supabase,
          test_run_id || null,
          true // isTestMode
        );
      } else {
        logger.warn('test_mode requested but user is not admin - ignoring flag', { userId: authenticatedUser.id });
      }
    }

    logger.info('Generation request received', {
      userId: authenticatedUser.id,
      metadata: {
        model_id: model_config.modelId,
        provider: model_config.provider,
        enhance_prompt
      }
    });

    // REQUIRE model_config from .ts registry - NO DATABASE LOOKUPS
    if (!model_config || !model_schema) {
      throw new Error(
        'model_config and model_schema are REQUIRED. ' +
        'Client must send full model definition from .ts registry. ' +
        'Database has been eliminated for model data.'
      );
    }

    logger.info('Using model config from .ts registry', {
      userId: authenticatedUser.id,
      metadata: {
        model_id: model_config.modelId,
        record_id: model_config.recordId,
        provider: model_config.provider
      }
    });

    // Transform model_config to Model type (for compatibility with existing code)
    const model: Model = {
      id: model_config.modelId,
      record_id: model_config.recordId,
      provider: model_config.provider,
      content_type: model_config.contentType,
      base_token_cost: model_config.baseCreditCost,
      input_schema: model_schema,
      cost_multipliers: model_config.costMultipliers || {},
      api_endpoint: model_config.apiEndpoint || undefined,
      payload_structure: model_config.payloadStructure || 'wrapper',
    };

    let parameters: Record<string, unknown> = custom_parameters;
    const enhancementInstruction: string | null = null;

    logger.debug('.ts registry model config applied', {
      userId: authenticatedUser.id,
      metadata: {
        model_id: model.id,
        record_id: model.record_id,
        provider: model.provider,
        has_schema: !!model.input_schema,
        source: '.ts registry (database eliminated)'
      }
    });

    // Log model schema information for debugging
    logger.debug('Model schema loaded', {
      userId: user?.id,
      metadata: { 
        model_id: model.id,
        has_schema: !!model.input_schema,
        schema_fields: model.input_schema?.properties ? Object.keys(model.input_schema.properties) : []
      }
    });

    // Schema-driven prompt field detection
    const promptFieldNames = ['prompt', 'positivePrompt', 'positive_prompt'];
    const promptFieldName = model.input_schema?.properties 
      ? promptFieldNames.find(name => name in (model.input_schema?.properties || {}))
      : null;
    const hasPromptField = !!promptFieldName;
    const promptRequired = hasPromptField && 
      Array.isArray(model.input_schema?.required) && 
      model.input_schema.required.includes(promptFieldName!);

    logger.debug('Prompt field analysis', {
      userId: user?.id,
      metadata: { 
        has_prompt_field: hasPromptField,
        prompt_field_name: promptFieldName,
        prompt_required: promptRequired
      }
    });

    // Phase 4: Check generation rate limits (skip for test mode)
    if (!isTestMode) {
      const { data: userSubscription } = await supabase
        .from('user_subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single();

      const userPlan = userSubscription?.plan || 'freemium';

      // Check hourly generation limit
      const hourAgo = new Date(Date.now() - 3600000);
      const { count: hourlyCount } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', hourAgo.toISOString());

      const { data: tierLimits } = await supabase
        .from('rate_limit_tiers')
        .select('*')
        .eq('tier', userPlan)
        .single();

      if (tierLimits && hourlyCount !== null && hourlyCount >= tierLimits.max_generations_per_hour) {
        return new Response(
          JSON.stringify({ 
            error: 'Hourly generation limit reached',
            limit: tierLimits.max_generations_per_hour,
            current: hourlyCount,
            reset_in_seconds: 3600 - Math.floor((Date.now() - new Date(hourAgo).getTime()) / 1000)
          }),
          { status: 429, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check concurrent generation limit
      const { count: concurrentCount } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', GENERATION_STATUS.PENDING);

      if (tierLimits && concurrentCount !== null && concurrentCount >= tierLimits.max_concurrent_generations) {
        logger.error('Concurrent generation limit exceeded', undefined, {
          userId: user.id,
          metadata: { 
            current: concurrentCount,
            limit: tierLimits.max_concurrent_generations 
          }
        });
        return new Response(
          JSON.stringify({ 
            error: 'Concurrent generation limit reached. Please wait for your current generation to complete.',
            limit: tierLimits.max_concurrent_generations,
            current: concurrentCount
          }),
          { status: 429, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
      } else {
        logger.info('TEST_MODE: Skipping rate limit checks', { userId: user.id });
      }

    // Validate required fields based on model's input schema
    const inputSchema = model.input_schema || {};
    const imageUrlsSchema = inputSchema.properties?.image_urls as any;
    if (imageUrlsSchema && imageUrlsSchema.required) {
      if (!parameters.image_urls || !Array.isArray(parameters.image_urls) || parameters.image_urls.length === 0) {
        return new Response(
          JSON.stringify({ error: 'image_urls is required for this model' }),
          { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Schema-driven prompt resolution
    // Extract prompt from parameters if model schema defines a prompt field
    if (!prompt && hasPromptField && promptFieldName) {
      if (parameters[promptFieldName]) {
        prompt = String(parameters[promptFieldName]);
        delete parameters[promptFieldName]; // Remove to avoid duplication
        logger.debug('Extracted prompt from schema field', { 
          userId: user?.id, 
          metadata: { field: promptFieldName } 
        });
      }
    }

    // Enhance prompt if requested and model has prompt field
    let finalPrompt = prompt || "";
    const originalPrompt = prompt || "";
    let usedEnhancementProvider = null;

    if (hasPromptField && prompt && (enhance_prompt || enhancementInstruction)) {
      logger.info('Enhancing prompt', { userId: user.id });
      try {
        const enhancementResult = await enhancePrompt(
          prompt,
          enhancementInstruction,
          enhancement_provider,
          model.content_type,
          model.provider,
          Boolean(parameters.customMode)
        );
        finalPrompt = enhancementResult.enhanced;
        usedEnhancementProvider = enhancementResult.provider;
        logger.info('Prompt enhanced successfully', {
          userId: user.id,
          metadata: { provider: usedEnhancementProvider }
        });
      } catch (error) {
        logger.error('Prompt enhancement failed', error instanceof Error ? error : undefined, {
          userId: user.id
        });
        // Continue with original prompt
      }
    }

    // Validate and filter parameters against schema, applying defaults for missing values
    function validateAndFilterParameters(
      parameters: Record<string, unknown>,
      schema: { properties?: Record<string, unknown> }
    ): Record<string, unknown> {
      if (!schema?.properties) return parameters;

      const allowedKeys = Object.keys(schema.properties);
      const filtered: Record<string, unknown> = {};
      const appliedDefaults: string[] = [];


      for (const key of allowedKeys) {
        const schemaProperty = schema.properties[key] as {
          enum?: unknown[];
          default?: unknown;
          type?: string;
          [key: string]: unknown;
        };
        const candidateValue = parameters[key];

        // Validate enum values
        if (schemaProperty?.enum && Array.isArray(schemaProperty.enum)) {
          // If candidate is empty, undefined, or null
          if (candidateValue === "" || candidateValue === undefined || candidateValue === null) {
            // Use default if available, otherwise omit parameter
            if (schemaProperty.default !== undefined) {
              filtered[key] = schemaProperty.default;
              appliedDefaults.push(`${key}=${JSON.stringify(schemaProperty.default)} (was empty)`);
            }
            // Else: omit the parameter entirely - don't add to filtered
          } 
          // If value provided but not in enum
          else if (!schemaProperty.enum.includes(candidateValue)) {
            // Use default if available
            if (schemaProperty.default !== undefined) {
              filtered[key] = schemaProperty.default;
              appliedDefaults.push(`${key}=${JSON.stringify(schemaProperty.default)} (invalid: ${JSON.stringify(candidateValue)})`);
            } else {
              // No default - return clear 400 error
            const error = `Invalid parameter '${key}'. Value '${candidateValue}' is not in allowed values: ${schemaProperty.enum.join(', ')}`;
              logger.error('Invalid parameter value', undefined, { metadata: { key, value: candidateValue } });
              throw new Error(error);
            }
          } 
          // Valid value - use as is
          else {
            filtered[key] = candidateValue;
          }
        }
        // Non-enum fields
        else if (candidateValue !== undefined && candidateValue !== null && candidateValue !== '') {
          filtered[key] = candidateValue;
        } 
        // Fall back to schema default if available
        else if (schemaProperty?.default !== undefined) {
          filtered[key] = schemaProperty.default;
          appliedDefaults.push(`${key}=${JSON.stringify(schemaProperty.default)}`);
        }
        // Otherwise, include the provided value (might be undefined) only if explicitly provided
        else if (candidateValue !== undefined) {
          filtered[key] = candidateValue;
        }
      }
      
      logger.debug('Parameters filtered from schema', {
        metadata: {
          original_keys: Object.keys(parameters).length,
          filtered_keys: Object.keys(filtered).length,
          defaults_applied: appliedDefaults.length
        }
      });
      
      return filtered;
    }

    // Normalize parameter keys by stripping "input." prefix if present
    function normalizeParameterKeys(params: Record<string, unknown>): Record<string, unknown> {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(params || {})) {
        const normalizedKey = key.startsWith('input.') ? key.substring(6) : key;
        normalized[normalizedKey] = value;
      }
      return normalized;
    }

    // Store original keys for logging
    const originalParamKeys = Object.keys(parameters || {});
    parameters = normalizeParameterKeys(parameters);
    logger.debug('Parameter keys normalized', {
      metadata: {
        original_count: originalParamKeys.length,
        normalized_count: Object.keys(parameters || {}).length
      }
    });

    // Provider-specific parameter mappings have been moved to provider preprocessing functions
    // See preprocessKieAiParameters() and preprocessRunwareParameters() in providers/

    let validatedParameters = validateAndFilterParameters(
      parameters,
      model.input_schema
    );

    // Coerce parameter types based on schema (e.g., "true" -> true for booleans)
    function coerceParametersBySchema(params: Record<string, unknown>, schema: { properties?: Record<string, unknown> }) {
      if (!schema?.properties) return params;
      const coerced: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(params)) {
        const prop = schema.properties[key] as { type?: string } | undefined;
        if (!prop) { coerced[key] = val; continue; }
        const t = prop.type;
        if (t === 'boolean') {
          coerced[key] = typeof val === 'boolean' ? val : String(val) === 'true';
        } else if (t === 'integer') {
          const n = typeof val === 'number' ? val : parseInt(String(val), 10);
          coerced[key] = Number.isNaN(n) ? val : n;
        } else if (t === 'number') {
          const n = typeof val === 'number' ? val : parseFloat(String(val));
          coerced[key] = Number.isNaN(n) ? val : n;
        } else if (t === 'array') {
          // Ensure arrays are properly formatted
          coerced[key] = Array.isArray(val) ? val : [val];
        } else {
          coerced[key] = val;
        }
      }
      return coerced;
    }

    validatedParameters = coerceParametersBySchema(validatedParameters, model.input_schema);

    // NOTE: Parameter validation and defaults are handled by validateAndFilterParameters()
    // which only passes parameters explicitly defined in the model's input_schema.
    // Any format defaults should be defined in the model schema itself.

    // Calculate token cost with validated parameters
    const tokenCost = calculateTokenCost(
      model.base_token_cost,
      model.cost_multipliers || {},
      validatedParameters
    );

    logger.info('Token cost calculated', {
      userId: user.id,
      metadata: { token_cost: tokenCost }
    });

    // SECURITY FIX: Transaction-like token deduction + generation creation
    // This prevents race conditions where tokens are deducted but generation fails
    let tokensDeducted = false;
    let generationCreated = false;
    let generation: {
      id: string;
      user_id: string;
      model_id: string;
      status: string;
      settings?: Record<string, unknown>;
      [key: string]: unknown;
    } | null = null;

    // Non-null reference after generation is created
    let createdGeneration: {
      id: string;
      user_id: string;
      model_id: string;
      status: string;
      settings?: Record<string, unknown>;
      [key: string]: unknown;
    };

    try {
      // Step 1: Check and deduct tokens atomically (skip for test mode)
      if (!isTestMode) {
        const { data: subscription, error: subError } = await supabase
          .from('user_subscriptions')
          .select('tokens_remaining')
          .eq('user_id', user.id)
          .single();

        if (subError || !subscription) {
          throw new Error('Subscription not found');
        }

        if (subscription.tokens_remaining < tokenCost) {
          return new Response(
            JSON.stringify({ 
              error: 'Insufficient credits',
              type: 'INSUFFICIENT_TOKENS',
              required: tokenCost,
              available: subscription.tokens_remaining,
              message: `You need ${tokenCost} credits but only have ${subscription.tokens_remaining} credits available.`
            }),
            { status: 402, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Deduct tokens using atomic database function with row-level locking
        const { data: deductResult, error: deductError } = await supabase
          .rpc('deduct_user_tokens', {
            p_user_id: user.id,
            p_cost: tokenCost
          });

        if (deductError) {
          logger.error('Token deduction failed', deductError instanceof Error ? deductError : new Error(String(deductError) || 'Database error'), {
            userId: user.id,
            metadata: { cost: tokenCost }
          });
          throw new Error('Failed to deduct tokens - database error');
        }

        if (!deductResult || deductResult.length === 0) {
          logger.error('Token deduction returned no result', undefined, {
            userId: user.id,
            metadata: { cost: tokenCost }
          });
          throw new Error('Failed to deduct tokens - no result returned');
        }

        const result = deductResult[0];
        
        if (!result.success) {
          if (result.error_message === 'Insufficient tokens') {
            return new Response(
              JSON.stringify({ 
                error: 'Insufficient credits',
                type: 'INSUFFICIENT_TOKENS',
                required: tokenCost,
                available: result.tokens_remaining || 0,
                message: `You need ${tokenCost} credits but only have ${result.tokens_remaining || 0} credits available.`
              }),
              { status: 402, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          logger.error('Token deduction failed', undefined, {
            userId: user.id,
            metadata: { error: result.error_message, cost: tokenCost }
          });
          throw new Error(`Failed to deduct tokens: ${result.error_message}`);
        }

        tokensDeducted = true;
        logger.info('Tokens deducted successfully', {
          userId: user.id,
          metadata: { 
            tokens_deducted: tokenCost,
            new_balance: result.tokens_remaining 
          }
        });

        // Log to audit_logs
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'tokens_deducted',
          metadata: {
            tokens_deducted: tokenCost,
            tokens_remaining: result.tokens_remaining,
          model_id: model.id,
          model_name: model.id // Use model.id as name
          }
        });
      } else {
        logger.info('TEST_MODE: Skipping token deduction (non-billable)', { userId: user.id });
      }

      // Generate unique webhook verification token for security
      const webhookToken = crypto.randomUUID();
      logger.debug('Generated webhook verification token', { userId: user.id });

      // Step 2: Detect base64 images in parameters (prevent DoS via oversized JSONB)
      const paramString = JSON.stringify(parameters);
      if (paramString.includes('data:image/') || paramString.includes(';base64,')) {
        logger.error('Base64 image detected in parameters', undefined, {
          userId: user.id,
          metadata: { paramSize: paramString.length }
        });
        
        throw new Error(
          'Base64-encoded images are not allowed in parameters. ' +
          'Please upload images to storage first and pass the URL instead.'
        );
      }

      // Step 3: Validate parameters before creating generation record
      const settingsToValidate = {
        ...parameters,
        prompt: finalPrompt,
        _webhook_token: webhookToken
      };

      const validationResult = validateGenerationSettings(settingsToValidate);
      if (!validationResult.success) {
        logger.error('JSONB validation failed', undefined, {
          userId: user.id,
          metadata: { error: validationResult.error }
        });
        throw new Error(`Invalid generation settings: ${validationResult.error}`);
      }

      // Step 4: Create generation record with validated settings
      const generationSettings = validationResult.data as Record<string, any>;

      const { data: gen, error: genError } = await supabase
        .from('generations')
        .insert({
          user_id: user.id,
          model_id: model.id,
          model_record_id: model.record_id,
          type: model.content_type,
          prompt: finalPrompt,
          original_prompt: originalPrompt,
          enhanced_prompt: enhance_prompt ? finalPrompt : null,
          enhancement_provider: usedEnhancementProvider,
          settings: generationSettings,
          tokens_used: tokenCost,
          actual_token_cost: tokenCost,
          status: 'pending',
          provider_task_id: null,
          workflow_execution_id: workflow_execution_id || null,
          workflow_step_number: workflow_step_number || null
        })
        .select()
        .single();

      if (genError || !gen) {
        logger.error('Generation creation failed', genError || undefined);
        if (testLogger) {
          await testLogger.logError(
            genError || new Error('Failed to create generation record'),
            'createGenerationRecord',
            { model_id: model.id, user_id: user.id }
          );
        }
        throw new Error('Failed to create generation record');
      }

      generation = gen;
      generationCreated = true;

      // Log to test execution system if in test mode
      if (testLogger && generation) {
        await testLogger.logEdgeFunctionStart({
          generationId: generation.id,
          modelId: model.id,
          provider: model.provider,
          userId: user.id,
        });

        await testLogger.logDatabaseUpdate(
          'generations',
          'insert',
          generation.id,
          { status: 'pending', tokens_used: tokenCost }
        );
      }

      // Ensure generation is non-null before proceeding
      if (!generation) {
        throw new Error('Failed to create generation record');
      }

      // Assign to non-null reference after confirming generation is created
      createdGeneration = generation; // Now guaranteed non-null
      
      logger.info('Generation record created', {
        userId: authenticatedUser.id,
        metadata: { generation_id: createdGeneration.id }
      });

      // Validate prompt only if model has prompt field
      if (hasPromptField) {
        if (promptRequired && (!prompt || prompt.trim() === '')) {
          throw new Error('Prompt is required for this model');
        }
        if (prompt && (prompt.length < 3 || prompt.length > 10000)) {
          throw new Error('Prompt must be between 3 and 10000 characters');
        }
      }

      // Log schema analysis for debugging
      logger.debug('Schema analysis', {
        userId: user?.id,
        metadata: {
          model_id: model.id,
          model_record_id: model.record_id,
          schema_properties: Object.keys(model.input_schema?.properties || {}),
          required_fields: model.input_schema?.required || [],
          declared_image_field: (model.input_schema as any)?.imageInputField || null,
          has_image_field_in_properties: (model.input_schema as any)?.imageInputField 
            ? !!(model.input_schema?.properties as any)?.[(model.input_schema as any).imageInputField]
            : false
        }
      });

      // Validate all required parameters from schema (skip all prompt aliases)
      if (model.input_schema?.required) {
        const promptAliases = ['prompt', 'positivePrompt', 'positive_prompt'];
        const missingParams: string[] = [];
        
        for (const requiredParam of model.input_schema.required) {
          if (promptAliases.includes(requiredParam)) continue; // already handled above
          if (validatedParameters[requiredParam] === undefined) {
            missingParams.push(requiredParam);
          }
        }
        
        if (missingParams.length > 0) {
          const error = `Missing required parameters: ${missingParams.join(', ')}. Schema requires: ${JSON.stringify(model.input_schema.required)}`;
          logger.error('Missing required parameters', new Error(error), {
            metadata: {
              missing: missingParams,
              provided: Object.keys(validatedParameters),
              schema_required: model.input_schema.required,
              declared_image_field: (model.input_schema as any)?.imageInputField
            }
          });
          throw new Error(error);
        }
      }

    } catch (txError) {
      logger.error('Transaction error', txError instanceof Error ? txError : new Error(String(txError)));
      
      // If generation was created but validation failed, update status to failed
      if (generationCreated && generation) {
        await supabase
          .from('generations')
          .update({
            status: 'failed',
            provider_response: { 
              error: txError instanceof Error ? txError.message : 'Validation failed',
              full_error: txError instanceof Error ? txError.toString() : String(txError),
              timestamp: new Date().toISOString()
            }
          })
          .eq('id', generation.id);
        
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'generation_failed',
          resource_type: 'generation',
          resource_id: generation.id,
          metadata: {
            error: txError instanceof Error ? txError.message : 'Validation failed',
            model_id: model.id,
            tokens_refunded: tokenCost,
            reason: 'validation_error'
          }
        });
      }
      
      // AUTOMATIC ROLLBACK: Refund tokens if deducted (skip for test mode)
      if (tokensDeducted && !isTestMode) {
        logger.info('Rolling back token deduction', {
          userId: user.id,
          metadata: { tokens_refunded: tokenCost }
        });
        await supabase.rpc('increment_tokens', {
          user_id_param: user.id,
          amount: tokenCost
        });
      } else if (isTestMode) {
        logger.info('TEST_MODE: No token rollback needed (non-billable)', { userId: user.id });
      }
      
      // Return 400 with specific error message instead of throwing
      const errorMessage = txError instanceof Error ? txError.message : 'Validation failed';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check circuit breaker
    if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER.threshold) {
      const elapsed = Date.now() - CIRCUIT_BREAKER.lastFailure;
      if (elapsed < CIRCUIT_BREAKER.timeout) {
        // Refund tokens using RPC for atomicity (skip for test mode)
        if (!isTestMode) {
          await supabase.rpc('increment_tokens', {
            user_id_param: user.id,
            amount: tokenCost
          });
        }

        return new Response(
          JSON.stringify({ 
            error: 'Provider temporarily unavailable. Please try again in a moment.',
            retry_after_seconds: Math.ceil((CIRCUIT_BREAKER.timeout - elapsed) / 1000)
          }),
          { status: 503, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
      CIRCUIT_BREAKER.failures = 0; // Reset after cooldown
    }

    // Track request in queue
    const requestPromise = (async () => {
      let providerRequest: Record<string, unknown> | null = null; // Declare outside try block for error handling access

      try {
        // Call provider with timeout
        const TIMEOUT_MS = 600000; // 600 seconds
        let timeoutId: number | undefined;
        
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Request timed out after 600 seconds'));
          }, TIMEOUT_MS) as unknown as number;
        });

        logger.debug('Sending parameters to provider', {
          userId: user.id,
          metadata: { parameter_keys: Object.keys(validatedParameters) }
        });
        
        // ========================================
        // STRICT SCHEMA ENFORCEMENT
        // Only allow parameters explicitly defined in input_schema
        // ========================================
        const schemaProperties = model.input_schema?.properties || {};
        const allowedPropertyNames = Object.keys(schemaProperties);
        
        // Include prompt ONLY in parameters if model has prompt field
        const parametersWithPrompt = { ...validatedParameters };
        if (hasPromptField && finalPrompt && promptFieldName) {
          parametersWithPrompt[promptFieldName] = finalPrompt;
        }
        
        // Filter to only allowed parameters
        const allowedParams: Record<string, unknown> = {};
        const unknownKeys: string[] = [];
        
        for (const [key, value] of Object.entries(parametersWithPrompt)) {
          if (allowedPropertyNames.includes(key)) {
            allowedParams[key] = value;
          } else {
            unknownKeys.push(key);
          }
        }
        
        // Reject request if unknown parameters are present
        if (unknownKeys.length > 0) {
          logger.error('Unknown parameters detected', undefined, {
            metadata: {
              unknownKeys,
              allowedPropertyNames,
              receivedKeys: Object.keys(parametersWithPrompt)
            }
          });
          
          throw new Error(
            `Unknown parameters not defined in model schema: ${unknownKeys.join(', ')}. ` +
            `Allowed parameters: ${allowedPropertyNames.join(', ')}`
          );
        }

        logger.info('Schema enforcement passed', {
          metadata: {
            allowedParams: Object.keys(allowedParams),
            schemaProperties: allowedPropertyNames
          }
        });

        // Convert base64 images to signed URLs (required for Kie.ai and other providers)
        const processedParams = await convertImagesToUrls(
          allowedParams,
          user.id,
          supabase,
          logger
        );

        // NOTE: Provider-specific parameter preprocessing (prompt->text, prompt->positivePrompt, etc.)
        // is now handled in individual model .ts files via preparePayload() functions.
        // Each model knows its own parameter requirements and handles transformations.

      providerRequest = {
        model: model.id,
        model_record_id: model.record_id,
        parameters: processedParams, // Parameters processed by model .ts files
        input_schema: model.input_schema,
        api_endpoint: model.api_endpoint,
        payload_structure: model.payload_structure || 'wrapper',
        userId: user.id,
        generationId: createdGeneration.id
      };

        logger.debug('Provider request prepared', {
          userId: user.id,
          metadata: {
            model_id: model.id,
            generation_id: createdGeneration.id,
            has_prompt_in_params: hasPromptField
          }
        });

        // Get webhookToken from generation settings for Kie.ai provider
        const webhookToken = createdGeneration.settings?._webhook_token as string | undefined;

        // Log provider API call if in test mode
        const apiCallStartTime = Date.now();
        if (testLogger) {
          await testLogger.logProviderRouting(model.provider, model.api_endpoint);
          await testLogger.logProviderApiCall(model.provider, providerRequest, apiCallStartTime);
        }

        interface ProviderResponse {
          metadata?: {
            task_id?: string;
            [key: string]: unknown;
          };
          storage_path?: string;
          output_data?: unknown;
          file_extension?: string;
          file_size?: number;
          [key: string]: unknown;
        }

        const providerResponse = await Promise.race([
          callProvider(model.provider, providerRequest, webhookToken),
          timeoutPromise
        ]) as ProviderResponse;

        if (timeoutId) clearTimeout(timeoutId);

        const apiCallDuration = Date.now() - apiCallStartTime;

        // Log provider response if in test mode
        if (testLogger) {
          await testLogger.logProviderApiResponse(
            model.provider,
            providerResponse,
            apiCallDuration,
            true
          );
          await testLogger.logPerformance(
            'providerApiCall',
            apiCallDuration,
            { provider: model.provider, model_id: model.id }
          );
        }

        logger.info('Provider response received', {
          userId: user.id,
          metadata: { generation_id: createdGeneration.id }
        });

        // Check if this is a webhook-based provider (Kie.ai)
        const isWebhookProvider = model.provider === 'kie_ai' && providerResponse.metadata?.task_id;

        if (isWebhookProvider) {
          // For webhook providers, update with task_id and mark as processing
          const taskId = providerResponse.metadata.task_id;
          logger.info('Webhook-based provider', {
            userId: user.id,
            metadata: { task_id: taskId, generation_id: createdGeneration.id }
          });

          const { error: updateError } = await supabase
            .from('generations')
            .update({
              provider_task_id: taskId,
              status: 'processing',
              provider_request: providerRequest,
              provider_response: providerResponse.metadata
            })
            .eq('id', createdGeneration.id);

          if (updateError) {
            logger.error('Failed to update generation with task ID', updateError instanceof Error ? updateError : new Error(String(updateError) || 'Database error'), {
              userId: user.id,
              metadata: { generation_id: createdGeneration.id }
            });
          }

          // Return immediately - webhook will complete the generation
          return new Response(
            JSON.stringify({
              id: createdGeneration.id,
              generation_id: createdGeneration.id,
              status: 'processing',
              tokens_used: tokenCost,
              content_type: model.content_type,
              enhanced: !!(enhance_prompt || enhancementInstruction),
              is_async: true,
              message: 'Generation started. Check back soon for results.'
            }),
            { status: 202, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Phase 3: Process storage upload asynchronously (fire-and-forget with improved error handling)
        const generationId = createdGeneration.id;

        // Upload and update in background (don't await, but with proper error handling)
        (async () => {
          try {
            const uploadStartTime = Date.now();
            let storagePath: string;
            let fileSize = providerResponse.file_size;

            // Check if provider already uploaded to storage
            if (providerResponse.storage_path) {
              logger.info('Content already in storage', {
                userId: user.id,
                metadata: { storage_path: providerResponse.storage_path }
              });
              storagePath = providerResponse.storage_path;
              
              // Get actual file size if not provided
              if (!fileSize) {
                const folderPath = storagePath.substring(0, storagePath.lastIndexOf('/'));
                const { data: fileData } = await supabase.storage
                  .from('generated-content')
                  .list(folderPath);
                
                if (fileData && fileData.length > 0) {
                  const file = fileData.find(f => f.name === 'output.mp4');
                  if (file) {
                    fileSize = file.metadata?.size || 0;
                  }
                }
              }
            } else {
              // Normal upload flow
              storagePath = await uploadToStorage(
                supabase,
                user.id,
                generationId,
                providerResponse.output_data,
                providerResponse.file_extension,
                model.content_type
              );
            }

            const uploadDuration = Date.now() - uploadStartTime;

            logger.info('Uploaded to storage', {
              userId: user.id,
              metadata: { storage_path: storagePath }
            });

            // Log storage upload if in test mode
            if (testLogger) {
              await testLogger.logStorageUpload(storagePath, fileSize, uploadDuration);
            }

            const { data: { publicUrl } } = supabase.storage
              .from('generated-content')
              .getPublicUrl(storagePath);

            await supabase
              .from('generations')
              .update({
                status: 'completed',
                output_url: publicUrl,
                storage_path: storagePath,
                file_size_bytes: fileSize,
                provider_request: providerRequest,
                provider_response: providerResponse.metadata
              })
              .eq('id', generationId);

            // Log database update if in test mode
            if (testLogger) {
              await testLogger.logDatabaseUpdate(
                'generations',
                'update',
                generationId,
                { status: 'completed', output_url: publicUrl }
              );
            }

            await supabase.from('audit_logs').insert({
              user_id: user.id,
              action: 'generation_completed',
              resource_type: 'generation',
              resource_id: generationId,
              metadata: {
                model_id: model.id,
                tokens_used: tokenCost,
                content_type: model.content_type,
                duration_ms: Date.now() - startTime
              }
            });

            logger.info('Background processing completed', {
              userId: user.id,
              metadata: { generation_id: generationId }
            });
          } catch (bgError) {
            logger.error('Background processing error', bgError instanceof Error ? bgError : undefined, {
              userId: user.id,
              metadata: { generation_id: generationId }
            });
            
            // Update to failed status if background task fails
            const errorMessage = bgError instanceof Error ? bgError.message : 'Background processing failed';
            await supabase
              .from('generations')
              .update({ 
                status: 'failed',
                provider_request: providerRequest,
                provider_response: { 
                  error: errorMessage,
                  full_error: bgError instanceof Error ? bgError.toString() : String(bgError),
                  timestamp: new Date().toISOString()
                } 
              })
              .eq('id', generationId);
          }
        })();

        // Reset circuit breaker on success
        CIRCUIT_BREAKER.failures = 0;

        logger.logDuration('Generation processing started', startTime, {
          userId: user.id,
          metadata: {
            generation_id: createdGeneration.id,
            model_id: model.id,
            tokens_used: tokenCost,
            content_type: model.content_type
          }
        });

        return new Response(
          JSON.stringify({
            id: createdGeneration.id,
            generation_id: createdGeneration.id,
            status: 'processing',
            tokens_used: tokenCost,
            content_type: model.content_type,
            enhanced: !!(enhance_prompt || enhancementInstruction),
            is_async: true
          }),
          { status: 202, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (providerError) {
        logger.error('Provider error', providerError instanceof Error ? providerError : new Error(String(providerError)), {
          userId: user.id,
          metadata: { generation_id: createdGeneration.id }
        });

        // Increment circuit breaker on failure
        CIRCUIT_BREAKER.failures++;
        CIRCUIT_BREAKER.lastFailure = Date.now();

        const errorMessage = providerError instanceof Error ? providerError.message : String(providerError);
        const isTimeout = errorMessage.includes('timed out');

        // Sanitize error for database storage (remove sensitive details)
        const sanitizedError = errorMessage.substring(0, 200) || 'Generation failed';

        await supabase
          .from('generations')
          .update({
            status: 'failed',
            tokens_used: 0,
            provider_request: providerRequest,
            provider_response: {
              error: sanitizedError,
              error_type: isTimeout ? 'timeout' : 'provider_error',
              timestamp: new Date().toISOString()
            }
          })
          .eq('id', createdGeneration.id);

        // Refund tokens using RPC for atomicity (skip for test mode)
        if (!isTestMode) {
          await supabase.rpc('increment_tokens', {
            user_id_param: user.id,
            amount: tokenCost
          });
          logger.info('Credits refunded', {
            userId: user.id,
            metadata: { 
              tokens_refunded: tokenCost,
              reason: isTimeout ? 'timeout' : 'provider_failure'
            }
          });
        } else {
          logger.info('TEST_MODE: No token refund needed (non-billable)', { userId: user.id });
        }

        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'generation_failed',
          resource_type: 'generation',
          resource_id: createdGeneration.id,
          metadata: {
            error: errorMessage,
            model_id: model.id,
            tokens_refunded: tokenCost,
            reason: isTimeout ? 'timeout' : 'provider_error',
            duration_ms: Date.now() - startTime
          }
        });

        logger.error('Generation failed', providerError instanceof Error ? providerError : new Error(String(providerError)), {
          userId: user.id,
          duration: Date.now() - startTime,
          metadata: {
            generation_id: createdGeneration.id,
            model_id: model.id,
            circuit_breaker_failures: CIRCUIT_BREAKER.failures
          }
        });

        throw providerError;
      }
    })();

    // Cast to Promise<GenerationResult> for tracking (actual return type is Response)
    activeRequests.set(requestId, requestPromise as unknown as Promise<GenerationResult>);

    try {
      return await requestPromise;
    } finally {
      activeRequests.delete(requestId);
    }

  } catch (error) {
    return createSafeErrorResponse(error, 'generate-content', responseHeaders);
  }
});

async function enhancePrompt(
  prompt: string,
  instruction: string | null,
  provider: string,
  contentType: string,
  modelProvider: string,
  customMode: boolean | undefined
): Promise<{ enhanced: string; provider: string }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  let systemPrompt = instruction;

  if (!systemPrompt) {
    // For Kie.ai audio non-custom mode, enforce strict 500 character limit
    if (modelProvider === 'kie_ai' && contentType === 'audio' && customMode === false) {
      systemPrompt = `You are a prompt enhancement AI for audio generation. Transform the user's prompt into an optimized prompt for better audio output.

CRITICAL CONSTRAINT: Your response MUST be MAXIMUM 480 characters (leaving room for any trailing spaces).

Keep the core intent, add key musical/audio details (genre, mood, instruments, tempo), but stay extremely concise. Use abbreviations where appropriate. Return ONLY the enhanced prompt under 480 characters, no explanations or quotation marks.`;
    } else {
      systemPrompt = `You are a prompt enhancement AI. Transform the user's prompt into a detailed, optimized prompt for ${contentType} generation. Keep the core intent but add professional details, style descriptions, and technical parameters that will improve the output quality. Return ONLY the enhanced prompt, no explanations.`;
    }
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Enhancement failed: ${response.status}`);
  }

  const data = await response.json();
  let enhanced = data.choices[0].message.content.trim();

  // Safety net: Force truncate if enhancement still exceeds limit for Kie.ai non-custom mode
  if (modelProvider === 'kie_ai' && contentType === 'audio' && customMode === false) {
    if (enhanced.length > 500) {
      // Truncate to stay within 500 character limit
      enhanced = enhanced.slice(0, 497) + '...';
    }
  }

  return { enhanced, provider: 'lovable_ai' };
}
