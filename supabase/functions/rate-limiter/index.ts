import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";



// Inline helper: sanitize errors before logging
function sanitizeError(error: any): any {
  if (error && typeof error === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { authorization, token, api_key, apiKey, secret, ...safe } = error;
    return safe;
  }
  return error;
}

// Inline helper: log errors using EdgeLogger
function logError(context: string, error: any, metadata?: any, logger?: EdgeLogger): void {
  const sanitized = sanitizeError(error);
  if (logger) {
    logger.error(context, new Error(JSON.stringify(sanitized)), { metadata });
  }
  // EdgeLogger should always be provided in production
}

// Inline helper: create standardized error response
function createErrorResponse(error: any, headers: any, context: string, metadata?: any, logger?: EdgeLogger): Response {
  logError(context, error, metadata, logger);
  const message = error?.message || 'An error occurred';
  const status = message.includes('Unauthorized') || message.includes('authorization') ? 401
    : message.includes('Forbidden') ? 403
    : message.includes('not found') ? 404
    : 400;
  
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...headers, 'Content-Type': 'application/json' } }
  );
}

// Rate limits configuration
const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowMinutes: 15,
    blockMinutes: 15,
  },
  signup: {
    maxAttempts: 3,
    windowMinutes: 60,
    blockMinutes: 60,
  },
  generation: {
    maxAttempts: 100,
    windowMinutes: 60,
    blockMinutes: 10,
  },
  api_call: {
    maxAttempts: 200,
    windowMinutes: 60,
    blockMinutes: 5,
  },
};

const rateLimitSchema = z.object({
  identifier: z.string().min(1).max(255),
  action: z.enum(['login', 'signup', 'generation', 'api_call']),
  user_id: z.string().uuid().optional(),
});

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const logger = new EdgeLogger('rate-limiter', requestId);
  let body: any;

  try {
    body = await req.json();
    const { identifier, action, user_id } = rateLimitSchema.parse(body);
    
    // Use composite key for authenticated requests (better tracking)
    const rateLimitKey = user_id 
      ? `user:${user_id}:${action}` 
      : `ip:${identifier}:${action}`;

    const config = RATE_LIMITS[action];

    // Initialize Supabase with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check current rate limit status
    const { data: rateLimit, error: fetchError } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('identifier', rateLimitKey)
      .eq('action', action)
      .maybeSingle();

    if (fetchError) {
      logger.error('Error fetching rate limit', fetchError instanceof Error ? fetchError : new Error(String(fetchError) || 'Database error'));
      throw fetchError;
    }

    const now = new Date();

    // If blocked, check if block period has expired
    if (rateLimit?.blocked_until) {
      const blockedUntil = new Date(rateLimit.blocked_until);
      if (now < blockedUntil) {
        const minutesRemaining = Math.ceil((blockedUntil.getTime() - now.getTime()) / 60000);
        return new Response(
          JSON.stringify({ 
            allowed: false, 
            error: `Too many attempts. Please try again in ${minutesRemaining} minute(s).`,
            blockedUntil: blockedUntil.toISOString(),
          }),
          { status: 429, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!rateLimit) {
      // First attempt - create new record
      const { error: insertError } = await supabaseAdmin
        .from('rate_limits')
        .insert({
          identifier: rateLimitKey,
          action,
          attempt_count: 1,
          first_attempt_at: now.toISOString(),
          last_attempt_at: now.toISOString(),
        });

      if (insertError) {
        logger.error('Error creating rate limit', insertError instanceof Error ? insertError : new Error(String(insertError) || 'Database error'));
        throw insertError;
      }

      return new Response(
        JSON.stringify({ allowed: true, remainingAttempts: config.maxAttempts - 1 }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if window has expired
    const firstAttempt = new Date(rateLimit.first_attempt_at);
    const windowExpired = (now.getTime() - firstAttempt.getTime()) > (config.windowMinutes * 60 * 1000);

    if (windowExpired) {
      // Reset the counter
      const { error: resetError } = await supabaseAdmin
        .from('rate_limits')
        .update({
          attempt_count: 1,
          first_attempt_at: now.toISOString(),
          last_attempt_at: now.toISOString(),
          blocked_until: null,
        })
        .eq('identifier', rateLimitKey)
        .eq('action', action);

      if (resetError) {
        logger.error('Error resetting rate limit', resetError);
        throw resetError;
      }

      return new Response(
        JSON.stringify({ allowed: true, remainingAttempts: config.maxAttempts - 1 }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment attempt count
    const newAttemptCount = rateLimit.attempt_count + 1;
    const isBlocked = newAttemptCount >= config.maxAttempts;

    interface RateLimitUpdate {
      attempt_count: number;
      last_attempt_at: string;
      blocked_until?: string;
    }

    const updateData: RateLimitUpdate = {
      attempt_count: newAttemptCount,
      last_attempt_at: now.toISOString(),
    };

    if (isBlocked) {
      const blockedUntil = new Date(now.getTime() + config.blockMinutes * 60 * 1000);
      updateData.blocked_until = blockedUntil.toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('rate_limits')
      .update(updateData)
      .eq('identifier', rateLimitKey)
      .eq('action', action);

    if (updateError) {
      const errorMsg = updateError && typeof updateError === 'object' && 'message' in updateError ? updateError.message : 'Database error';
      logger.error('Error updating rate limit', updateError instanceof Error ? updateError : new Error(String(errorMsg)));
      throw updateError;
    }

    if (isBlocked) {
      // Log rate limit block to audit logs
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user_id || null,
        action: 'rate_limit_blocked',
        resource_type: 'rate_limit',
        resource_id: rateLimitKey,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        metadata: { 
          action, 
          attempt_count: newAttemptCount,
          blocked_until: updateData.blocked_until 
        },
      });

      return new Response(
        JSON.stringify({ 
          allowed: false, 
          error: `Too many attempts. Please try again later.`,
      blockedUntil: updateData.blocked_until,
        }),
        { status: 429, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.debug('Rate limit checked', { 
      metadata: { identifier, action, allowed: true }
    });
    logger.logDuration('Rate limit check', startTime);

    return new Response(
      JSON.stringify({ allowed: true, remainingAttempts: config.maxAttempts - newAttemptCount }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Rate limiter error', error as Error);
    return createErrorResponse(error, corsHeaders, 'rate-limiter', {
      identifier: body?.identifier,
      action: body?.action,
    });
  }
});
