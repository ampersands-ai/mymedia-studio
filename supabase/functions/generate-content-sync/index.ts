import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { callRunware } from "./providers/runware.ts";
import { calculateTokenCost } from "./utils/token-calculator.ts";
import { uploadToStorage } from "./utils/storage.ts";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getModel } from "../_shared/registry/index.ts";
import { GENERATION_STATUS, AUDIT_ACTIONS } from "../_shared/constants.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

// Type definitions
interface EdgeFunctionUser {
  id: string;
  email?: string;
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
}

// Zod schema for sync generation requests
const GenerateContentSyncRequestSchema = z.object({
  model_id: z.string().optional(),
  model_record_id: z.string().optional(),
  prompt: z.string().optional(), // Can be in custom_parameters too
  custom_parameters: z.record(z.unknown()).optional().default({}),
  workflow_execution_id: z.string().uuid().optional(),
  workflow_step_number: z.number().int().optional(),
  user_id: z.string().uuid().optional(), // For service role
}).refine(
  (data) => data.model_id || data.model_record_id,
  { message: "Either model_id or model_record_id must be provided" }
);

type GenerateContentSyncRequest = z.infer<typeof GenerateContentSyncRequestSchema>;

/**
 * Synchronous generation endpoint for immediate-response providers (Runware)
 * This is completely separate from the async webhook-based generate-content endpoint
 */
Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const logger = new EdgeLogger('generate-content-sync', requestId, supabase, true);

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
        logger.error('Authentication failed', authError || new Error('No user data'));
        throw new Error('Unauthorized: Invalid user token');
      }
      user = { id: userData.user.id, email: userData.user.email };
    }

    // Validate request body with Zod
    const requestBody = await req.json();
    let validatedRequest: GenerateContentSyncRequest;
    
    try {
      validatedRequest = GenerateContentSyncRequestSchema.parse(requestBody);
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
      model_id, 
      model_record_id,
      prompt, 
      custom_parameters = {},
      workflow_execution_id,
      workflow_step_number,
      user_id, // For service role calls (test mode)
    } = validatedRequest;
    
    // If service role, require user_id in body
    if (isServiceRole) {
      if (!user_id) {
        throw new Error('user_id required when using service role authentication');
      }
      user = { id: user_id };
      logger.info('Test mode - using user_id from request', { metadata: { user_id } });
    }

    // Ensure user is set at this point
    if (!user) {
      throw new Error('User authentication failed');
    }

    // Compute effective prompt with fallbacks and validate early
    const effectivePrompt = (
      (prompt ?? '') ||
      (custom_parameters?.positivePrompt ?? '') ||
      (custom_parameters?.prompt ?? '')
    ).toString().trim();

    if (effectivePrompt.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required and must be at least 2 characters.' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Synchronous generation request', {
      userId: user.id,
      metadata: { model_record_id, model_id }
    });

    // ADR 007: Load model configuration from registry
    let model: Model;

    if (model_record_id) {
      // Use record_id - guaranteed unique
      try {
        const modelModule = await getModel(model_record_id);
        const config = modelModule.MODEL_CONFIG;

        // Check if model is active
        if (!config.isActive) {
          throw new Error('Model is inactive');
        }

        // Convert registry format to expected Model format
        model = {
          id: config.id,
          record_id: config.recordId,
          provider: config.provider,
          content_type: config.contentType,
          base_token_cost: config.baseCost,
          cost_multipliers: undefined, // Cost multipliers moved to model files
          input_schema: modelModule.SCHEMA
        };
      } catch (e) {
        throw new Error(`Model not found or inactive: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else if (model_id) {
      // Legacy model_id path - not supported with registry
      logger.warn('Legacy model_id usage detected', {
        metadata: { model_id }
      });
      return new Response(
        JSON.stringify({
          error: 'model_id is deprecated. Please use model_record_id instead.',
          code: 'DEPRECATED_MODEL_ID',
          deprecated_id: model_id
        }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Must provide model_record_id');
    }

    // Verify this is a runware model
    if (model.provider !== 'runware') {
      throw new Error('This endpoint only supports Runware models. Use generate-content for other providers.');
    }

    logger.info('Model loaded', {
      userId: user.id,
      metadata: { model_id: model.id, provider: model.provider }
    });

    // Rate limiting check
    const { data: userSubscription } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const userPlan = userSubscription?.plan || 'freemium';

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
        }),
        { status: 429, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    interface SchemaProperty {
      showToUser?: boolean;
      default?: unknown;
      enum?: unknown[];
    }

    interface InputSchema {
      properties?: Record<string, SchemaProperty>;
    }

    // Validate and filter parameters
    function validateAndFilterParameters(
      parameters: Record<string, unknown>,
      schema: InputSchema
    ): Record<string, unknown> {
      if (!schema?.properties) return parameters;

      const allowedKeys = Object.keys(schema.properties);
      const filtered: Record<string, unknown> = {};
      
      for (const key of allowedKeys) {
        const schemaProperty = schema.properties[key];
        const candidateValue = parameters[key];
        
        // For parameters marked showToUser: false, ALWAYS use schema default (ignore user input)
        if (schemaProperty?.showToUser === false) {
          if (schemaProperty?.default !== undefined) {
            filtered[key] = schemaProperty.default;
          }
          continue;
        }
        
        // For user-visible parameters, handle normally
        if (schemaProperty?.enum && Array.isArray(schemaProperty.enum)) {
          if (candidateValue === "" || candidateValue === undefined || candidateValue === null) {
            if (schemaProperty.default !== undefined) {
              filtered[key] = schemaProperty.default;
            }
          } else if (!schemaProperty.enum.includes(candidateValue)) {
            if (schemaProperty.default !== undefined) {
              filtered[key] = schemaProperty.default;
            } else {
              throw new Error(`Invalid parameter '${key}'. Value '${candidateValue}' not in allowed values.`);
            }
          } else {
            filtered[key] = candidateValue;
          }
        } else if (candidateValue !== undefined && candidateValue !== null && candidateValue !== '') {
          filtered[key] = candidateValue;
        } else if (schemaProperty?.default !== undefined) {
          filtered[key] = schemaProperty.default;
        } else if (candidateValue !== undefined) {
          filtered[key] = candidateValue;
        }
      }
      
      return filtered;
    }

    const parameters = validateAndFilterParameters(
      custom_parameters, 
      model.input_schema ? { properties: model.input_schema.properties || {}, required: model.input_schema.required || [] } : { properties: {}, required: [] }
    );
    
    logger.debug('Parameters validated', {
      userId: user.id,
      metadata: { parameter_keys: Object.keys(parameters) }
    });

    // Calculate token cost
    const tokenCost = calculateTokenCost(
      model.base_token_cost,
      model.cost_multipliers || {},
      parameters
    );

    logger.info('Token cost calculated', {
      userId: user.id,
      metadata: { token_cost: tokenCost }
    });

    // Check if this is a free retry (skip token deduction for generations taking >5 minutes)
    const skipTokenDeduction = custom_parameters.skip_token_deduction === true;

    if (skipTokenDeduction) {
      logger.info('Free regeneration - skipping token deduction', { userId: user.id });
    } else {
      // Check and deduct tokens
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
          }),
          { status: 402, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deduct tokens with row count verification
      const { data: updateResult, error: deductError } = await supabase
        .from('user_subscriptions')
        .update({ tokens_remaining: subscription.tokens_remaining - tokenCost })
        .eq('user_id', user.id)
        .eq('tokens_remaining', subscription.tokens_remaining)
        .select('tokens_remaining');

      if (deductError) {
        logger.error('Token deduction failed', deductError instanceof Error ? deductError : new Error(String(deductError) || 'Database error'), { userId: user.id });
        throw new Error('Failed to deduct tokens - database error');
      }

      if (!updateResult || updateResult.length === 0) {
        logger.error('Optimistic lock failed - concurrent update', undefined, {
          userId: user.id,
          metadata: { expected_tokens: subscription.tokens_remaining, cost: tokenCost }
        });
        throw new Error('Failed to deduct tokens - concurrent update detected. Please retry.');
      }

      logger.info('Tokens deducted successfully', {
        userId: user.id,
        metadata: { 
          tokens_deducted: tokenCost,
          new_balance: updateResult[0]?.tokens_remaining 
        }
      });

      // Log to audit_logs
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: AUDIT_ACTIONS.TOKENS_DEDUCTED,
        metadata: {
          tokens_deducted: tokenCost,
          tokens_remaining: updateResult[0]?.tokens_remaining,
          model_id: model.id,
          operation: 'sync_generation'
        }
      });
    }

    // Create generation record
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        model_id: model.id,
        model_record_id: model.record_id,
        type: model.content_type,
        prompt: effectivePrompt,
        original_prompt: effectivePrompt,
        settings: parameters,
        tokens_used: tokenCost,
        actual_token_cost: tokenCost,
        status: GENERATION_STATUS.PENDING,
        workflow_execution_id: workflow_execution_id || null,
        workflow_step_number: workflow_step_number || null
      })
      .select()
      .single();

    if (genError || !generation) {
      // Refund tokens
      await supabase.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: tokenCost
      });
      throw new Error('Failed to create generation record');
    }

    logger.info('Generation record created', {
      userId: user.id,
      metadata: { generation_id: generation.id }
    });

    try {
      // Call Runware provider synchronously
      const providerRequest = {
        model: model.id,
        prompt: effectivePrompt,
        parameters: parameters,
        input_schema: model.input_schema,
      };

      logger.info('Calling Runware provider', {
        userId: user.id,
        metadata: { generation_id: generation.id }
      });
      
      const providerResponse = await callRunware(providerRequest);

      logger.info('Provider response received', {
        userId: user.id,
        metadata: { generation_id: generation.id }
      });

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
          generation.id,
          providerResponse.output_data,
          providerResponse.file_extension,
          model.content_type
        );
      }

      const { data: { publicUrl } } = supabase.storage
        .from('generated-content')
        .getPublicUrl(storagePath);

      // Update generation to completed
      await supabase
        .from('generations')
        .update({
          status: GENERATION_STATUS.COMPLETED,
          output_url: publicUrl,
          storage_path: storagePath,
          file_size_bytes: fileSize,
          provider_request: providerRequest,
          provider_response: providerResponse.metadata
        })
        .eq('id', generation.id);

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: AUDIT_ACTIONS.GENERATION_COMPLETED,
        resource_type: 'generation',
        resource_id: generation.id,
        metadata: {
          model_id: model.id,
          tokens_used: tokenCost,
          content_type: model.content_type,
          duration_ms: Date.now() - startTime,
          provider: 'runware'
        }
      });

      logger.logDuration('Synchronous generation completed', startTime, {
        userId: user.id,
        metadata: {
          generation_id: generation.id,
          model_id: model.id,
          tokens_used: tokenCost,
          provider: 'runware'
        }
      });

      return new Response(
        JSON.stringify({
          id: generation.id,
          status: 'completed',
          output_url: publicUrl,
          tokens_used: tokenCost,
          content_type: model.content_type
        }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (providerError: unknown) {
      const error = providerError instanceof Error ? providerError : new Error(String(providerError));
      logger.error('Provider error', error, {
        userId: user.id,
        metadata: { generation_id: generation.id }
      });

      // Update generation to failed
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          tokens_used: 0,
          provider_response: {
            error: error.message?.substring(0, 200) || 'Generation failed',
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', generation.id);

      // Refund tokens
      await supabase.rpc('increment_tokens', {
        user_id_param: user.id,
        amount: tokenCost
      });

      logger.info('Tokens refunded', {
        userId: user.id,
        metadata: { tokens_refunded: tokenCost }
      });

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'generation_failed',
        resource_type: 'generation',
        resource_id: generation.id,
        metadata: {
          error: error.message,
          model_id: model.id,
          tokens_refunded: tokenCost,
          provider: 'runware'
        }
      });

      throw error;
    }

  } catch (error) {
    return createSafeErrorResponse(error, 'generate-content-sync', responseHeaders);
  }
});
