/**
 * Validation Handler Module
 * Handles request validation, authentication, and rate limiting
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../../_shared/edge-logger.ts";
import {
  GenerateContentRequestSchema,
  type GenerateContentRequest
} from "../../_shared/schemas.ts";
import { GENERATION_STATUS } from "../../_shared/constants.ts";

// Type definitions
export interface EdgeFunctionUser {
  id: string;
  email?: string;
}

export interface Model {
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

export interface ValidationResult {
  success: true;
  user: EdgeFunctionUser;
  validatedRequest: GenerateContentRequest;
  model: Model;
  isServiceRole: boolean;
  isTestMode: boolean;
}

export interface ValidationError {
  success: false;
  response: Response;
}

/**
 * Normalize content type to match database constraint
 */
export function normalizeContentType(contentType: string): 'image' | 'video' | 'text' | 'audio' {
  const typeMap: Record<string, 'image' | 'video' | 'text' | 'audio'> = {
    'prompt_to_image': 'image',
    'image_editing': 'image',
    'image_to_video': 'video',
    'prompt_to_video': 'video',
    'lip_sync': 'video',
    'video_to_video': 'video',
    'prompt_to_audio': 'audio',
  };
  
  const mapped = typeMap[contentType.toLowerCase()];
  if (mapped) return mapped;
  
  const normalized = contentType.toLowerCase();
  if (normalized.includes('video') || normalized.includes('animation')) {
    return 'video';
  }
  if (normalized.includes('audio') || normalized.includes('voice') || normalized.includes('music') || normalized.includes('sound')) {
    return 'audio';
  }
  if (normalized.includes('image') || normalized.includes('photo') || normalized.includes('picture')) {
    return 'image';
  }
  if (normalized.includes('text') || normalized.includes('caption') || normalized.includes('script')) {
    return 'text';
  }
  
  return 'text';
}

/**
 * Authenticate user from request
 */
export async function authenticateUser(
  req: Request,
  supabase: SupabaseClient,
  logger: EdgeLogger
): Promise<{ user: EdgeFunctionUser | null; isServiceRole: boolean }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const isServiceRole = token === supabaseKey;
  
  let user: EdgeFunctionUser | null = null;
  
  if (isServiceRole) {
    logger.info('Service role authentication - test mode');
  } else {
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      logger.error('Authentication failed', authError || undefined);
      throw new Error('Unauthorized: Invalid user token');
    }
    user = { id: userData.user.id, email: userData.user.email };
  }

  return { user, isServiceRole };
}

/**
 * Check email verification status
 */
export async function checkEmailVerification(
  supabase: SupabaseClient,
  userId: string,
  logger: EdgeLogger,
  responseHeaders: Record<string, string>
): Promise<Response | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email_verified')
    .eq('id', userId)
    .single();
  
  if (profileError) {
    logger.warn('Failed to check email verification status', { userId, metadata: { error: profileError.message } });
    return null;
  }
  
  if (!profile?.email_verified) {
    logger.info('Generation blocked - email not verified', { userId });
    return new Response(
      JSON.stringify({ 
        error: 'Email verification required',
        message: 'Please verify your email address before generating content. Check your inbox for the verification email.',
        code: 'EMAIL_NOT_VERIFIED'
      }),
      { status: 403, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  return null;
}

/**
 * Validate request body with Zod
 */
export function validateRequestBody(
  requestBody: unknown,
  logger: EdgeLogger,
  responseHeaders: Record<string, string>
): { success: true; data: GenerateContentRequest } | { success: false; response: Response } {
  try {
    const validatedRequest = GenerateContentRequestSchema.parse(requestBody);
    return { success: true, data: validatedRequest };
  } catch (zodError: unknown) {
    const error = zodError instanceof Error ? zodError : new Error('Validation error');
    logger.error('Request validation failed', error);
    return {
      success: false,
      response: new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters',
          details: error.message
        }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }
}

/**
 * Check generation rate limits
 */
export async function checkRateLimits(
  supabase: SupabaseClient,
  userId: string,
  existingGenerationId: string | undefined,
  logger: EdgeLogger,
  responseHeaders: Record<string, string>
): Promise<Response | null> {
  // Check if user is admin - admins bypass all rate limits
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleData) {
    logger.info('Admin user - bypassing rate limits', { userId });
    return null;
  }

  const { data: userSubscription } = await supabase
    .from('user_subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .single();

  const userPlan = userSubscription?.plan || 'freemium';

  // Check hourly generation limit
  const hourAgo = new Date(Date.now() - 3600000);
  const { count: hourlyCount } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
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
  let concurrentQuery = supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', [GENERATION_STATUS.PENDING, GENERATION_STATUS.PROCESSING]);

  if (existingGenerationId) {
    concurrentQuery = concurrentQuery.neq('id', existingGenerationId);
  }

  const { count: concurrentCount } = await concurrentQuery;

  if (tierLimits && concurrentCount !== null && concurrentCount >= tierLimits.max_concurrent_generations) {
    logger.error('Concurrent generation limit exceeded', undefined, {
      userId,
      metadata: { 
        current: concurrentCount,
        limit: tierLimits.max_concurrent_generations,
        excluded_generation_id: existingGenerationId
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

  return null;
}

/**
 * Transform model_config to Model type
 */
export function transformModelConfig(
  modelConfig: GenerateContentRequest['model_config'],
  modelSchema: GenerateContentRequest['model_schema']
): Model {
  return {
    id: modelConfig.modelId,
    record_id: modelConfig.recordId,
    provider: modelConfig.provider,
    content_type: modelConfig.contentType,
    base_token_cost: modelConfig.baseCreditCost,
    input_schema: modelSchema,
    cost_multipliers: modelConfig.costMultipliers ?? {},
    api_endpoint: modelConfig.apiEndpoint || undefined,
    payload_structure: modelConfig.payloadStructure || 'wrapper',
  };
}

/**
 * API control parameters that models can pass but aren't user-facing schema fields
 */
export const API_CONTROL_PARAMS = [
  'taskType', 'model', 'version', 'apiVersion',
  'width', 'height',
  'outputType', 'outputFormat', 'outputQuality',
  'includeCost', 'safety',
  'providerSettings',
  'frameImages',
];

/**
 * Validate and filter parameters against schema
 */
export function validateAndFilterParameters(
  parameters: Record<string, unknown>,
  schema: { properties?: Record<string, unknown> },
  options: { applyDefaults?: boolean } = {},
  logger?: EdgeLogger
): Record<string, unknown> {
  if (!schema?.properties) return parameters;

  const applyDefaults = options.applyDefaults !== false;
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
      if (candidateValue === "" || candidateValue === undefined || candidateValue === null) {
        if (applyDefaults && schemaProperty.default !== undefined) {
          filtered[key] = schemaProperty.default;
          appliedDefaults.push(`${key}=${JSON.stringify(schemaProperty.default)} (was empty)`);
        }
      }
      else if (!schemaProperty.enum.includes(candidateValue)) {
        if (applyDefaults && schemaProperty.default !== undefined) {
          filtered[key] = schemaProperty.default;
          appliedDefaults.push(`${key}=${JSON.stringify(schemaProperty.default)} (invalid: ${JSON.stringify(candidateValue)})`);
        } else {
          const error = `Invalid parameter '${key}'. Value '${candidateValue}' is not in allowed values: ${schemaProperty.enum.join(', ')}`;
          throw new Error(error);
        }
      }
      else {
        filtered[key] = candidateValue;
      }
    }
    else if (candidateValue !== undefined && candidateValue !== null && candidateValue !== '') {
      filtered[key] = candidateValue;
    }
    else if (applyDefaults && schemaProperty?.default !== undefined) {
      filtered[key] = schemaProperty.default;
      appliedDefaults.push(`${key}=${JSON.stringify(schemaProperty.default)}`);
    }
  }

  // Preserve API control parameters
  for (const controlParam of API_CONTROL_PARAMS) {
    if (controlParam in parameters && parameters[controlParam] !== undefined) {
      filtered[controlParam] = parameters[controlParam];
    }
  }

  if (logger) {
    logger.debug('Parameters filtered from schema', {
      metadata: {
        original_keys: Object.keys(parameters).length,
        filtered_keys: Object.keys(filtered).length,
        defaults_applied: appliedDefaults.length,
        defaults_enabled: applyDefaults
      }
    });
  }

  return filtered;
}

/**
 * Coerce parameter types based on schema
 */
export function coerceParametersBySchema(
  params: Record<string, unknown>,
  schema: { properties?: Record<string, unknown> }
): Record<string, unknown> {
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
      coerced[key] = Array.isArray(val) ? val : [val];
    } else {
      coerced[key] = val;
    }
  }
  return coerced;
}

/**
 * Normalize parameter keys by stripping "input." prefix
 */
export function normalizeParameterKeys(params: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params || {})) {
    const normalizedKey = key.startsWith('input.') ? key.substring(6) : key;
    normalized[normalizedKey] = value;
  }
  return normalized;
}

/**
 * Check for base64 images in parameters
 */
export function detectBase64Images(
  parameters: Record<string, unknown>,
  logger: EdgeLogger,
  userId: string,
  modelId: string,
  provider: string
): void {
  const paramString = JSON.stringify(parameters);
  if (paramString.includes('data:image/') || paramString.includes(';base64,')) {
    const affectedFields = Object.keys(parameters).filter(key => {
      const value = parameters[key];
      if (typeof value === 'string') {
        return value.includes('data:image/') || value.includes(';base64,');
      }
      if (Array.isArray(value)) {
        return value.some(item => 
          typeof item === 'string' && (item.includes('data:image/') || item.includes(';base64,'))
        );
      }
      return false;
    });

    logger.error('Base64 image detected in parameters - FAIL-SAFE TRIGGERED', undefined, {
      userId,
      metadata: { 
        affectedFields,
        fieldCount: affectedFields.length,
        paramSize: paramString.length,
        model_id: modelId,
        provider
      }
    });
    
    throw new Error(
      `Base64-encoded images are not allowed in parameters. ` +
      `Affected field(s): ${affectedFields.join(', ')}. ` +
      `Please upload images to storage first and pass the URL instead.`
    );
  }
}

/**
 * Analyze prompt field from schema
 */
export function analyzePromptField(inputSchema: Model['input_schema']): {
  hasPromptField: boolean;
  promptFieldName: string | null;
  promptRequired: boolean;
} {
  const promptFieldNames = ['prompt', 'positivePrompt', 'positive_prompt'];
  const promptFieldName = inputSchema?.properties 
    ? promptFieldNames.find(name => name in (inputSchema?.properties || {}))
    : null;
  const hasPromptField = !!promptFieldName;
  const promptRequired = hasPromptField && 
    Array.isArray(inputSchema?.required) && 
    inputSchema.required.includes(promptFieldName!);

  return { hasPromptField, promptFieldName: promptFieldName || null, promptRequired };
}
