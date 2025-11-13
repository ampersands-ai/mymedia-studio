/**
 * Standard Edge Function Template
 * 
 * This template demonstrates the standardized pattern for creating edge functions with:
 * - Environment variable validation with Zod
 * - Request body validation with Zod
 * - Structured error responses (safe for clients)
 * - Comprehensive logging with request IDs
 * - Performance timing
 * - CORS support
 * - Type safety
 * 
 * @example
 * Save as: supabase/functions/your-function-name/index.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

// ============= CORS Configuration =============

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= Environment Validation =============

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Add your required env vars here
});

type Env = z.infer<typeof EnvSchema>;

function validateEnv(): Env {
  try {
    return EnvSchema.parse({
      SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      // Add your env vars here
    });
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
}

// ============= Request Validation =============

const RequestBodySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  // Add your request fields here
});

type RequestBody = z.infer<typeof RequestBodySchema>;

// ============= Response Types =============

interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  requestId: string;
  duration: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  requestId: string;
}

// ============= Logging Utility =============

class EdgeLogger {
  constructor(
    private functionName: string,
    private requestId: string
  ) {}

  private log(level: string, message: string, context?: Record<string, unknown>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      function: this.functionName,
      requestId: this.requestId,
      message,
      ...context,
    };
    console.log(JSON.stringify(logEntry));
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, {
      ...context,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    });
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  logDuration(operation: string, startTime: number, context?: Record<string, unknown>) {
    const duration = Date.now() - startTime;
    this.info(`${operation} completed`, {
      ...context,
      duration,
    });
  }
}

// ============= Error Handler =============

function createErrorResponse(
  error: unknown,
  requestId: string,
  logger: EdgeLogger
): Response {
  // Log full error server-side
  logger.error('Request failed', error as Error);

  // Determine safe client message
  let message = 'An error occurred processing your request';
  let code = 'INTERNAL_ERROR';
  let status = 500;

  if (error instanceof z.ZodError) {
    message = 'Invalid request parameters';
    code = 'VALIDATION_ERROR';
    status = 400;
    logger.warn('Validation error', { 
      issues: error.issues 
    });
  } else if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes('auth') || errorMsg.includes('unauthorized')) {
      message = 'Authentication failed';
      code = 'AUTH_ERROR';
      status = 401;
    } else if (errorMsg.includes('not found')) {
      message = 'Resource not found';
      code = 'NOT_FOUND';
      status = 404;
    } else if (errorMsg.includes('timeout')) {
      message = 'Request timed out';
      code = 'TIMEOUT_ERROR';
      status = 504;
    }
  }

  const response: ErrorResponse = {
    success: false,
    error: message,
    code,
    requestId,
  };

  return new Response(
    JSON.stringify(response),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

// ============= Main Handler =============

Deno.serve(async (req: Request) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();
  const logger = new EdgeLogger('your-function-name', requestId);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info('Request received', {
      method: req.method,
      url: req.url,
    });

    // Validate environment
    const env = validateEnv();
    logger.info('Environment validated');

    // Validate authentication (optional - remove if function is public)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get authenticated user (optional - remove if function is public)
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    logger.info('User authenticated', { userId: user.id });

    // Parse and validate request body
    let body: RequestBody;
    try {
      const rawBody = await req.json();
      body = RequestBodySchema.parse(rawBody);
      logger.info('Request body validated', { 
        fields: Object.keys(body) 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Request validation failed', { 
          issues: error.issues 
        });
      }
      throw error;
    }

    // ============= Your Business Logic Here =============
    
    logger.info('Processing request', { 
      name: body.name 
    });

    // Example: Query database
    const { data, error: dbError } = await supabase
      .from('your_table')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (dbError) {
      throw dbError;
    }

    // Example: Perform operations
    const result = {
      id: data.id,
      name: data.name,
      processed: true,
      timestamp: new Date().toISOString(),
    };

    // ============= End Business Logic =============

    const duration = Date.now() - startTime;
    logger.info('Request completed successfully', { 
      duration,
      resultId: result.id,
    });

    const response: SuccessResponse = {
      success: true,
      data: result,
      requestId,
      duration,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    return createErrorResponse(error, requestId, logger);
  }
});

/* 
 * Configuration for supabase/config.toml:
 * 
 * [functions.your-function-name]
 * verify_jwt = true  # Set to false if function should be public
 * 
 */
