/**
 * Rate Limit Middleware for Edge Functions
 * 
 * Production-grade rate limiting middleware with:
 * - Atomic PostgreSQL-based rate limiting (no race conditions)
 * - Pre-configured tiers for different use cases
 * - Automatic header generation
 * - User identification from JWT
 * - Fail-open design for reliability
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SlidingWindowRateLimiter,
  RATE_LIMIT_TIERS,
  createRateLimitHeaders,
  createRateLimitErrorResponse,
  type RateLimitInfo,
} from "./enhanced-rate-limiter.ts";

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

export interface RateLimitOptions {
  tier: RateLimitTier;
  action: string;
  identifier?: string; // Override automatic identification
  skipRateLimit?: boolean; // For admin/test mode
}

export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
  headers: Record<string, string>;
  errorResponse?: Response;
}

/**
 * Extract user ID from authorization header
 */
export async function extractUserId(
  req: Request,
  supabase: SupabaseClient
): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Check if it's the service role key
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (token === serviceRoleKey) {
    return 'service_role'; // Skip rate limiting for service role
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Get identifier for rate limiting (user ID, IP, or custom)
 */
export async function getRateLimitIdentifier(
  req: Request,
  supabase: SupabaseClient,
  customIdentifier?: string
): Promise<string> {
  if (customIdentifier) {
    return customIdentifier;
  }

  // Try to get user ID
  const userId = await extractUserId(req, supabase);
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP address
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  req: Request,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  // Skip rate limiting if explicitly disabled
  if (options.skipRateLimit) {
    return {
      allowed: true,
      info: {
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 60000),
        currentCount: 0,
        windowStart: new Date(),
      },
      headers: {},
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // Fail-open if environment variables are missing
  if (!supabaseUrl || !supabaseKey) {
    console.error('[RateLimitMiddleware] Missing environment variables');
    return {
      allowed: true,
      info: {
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 60000),
        currentCount: 0,
        windowStart: new Date(),
      },
      headers: {},
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const identifier = await getRateLimitIdentifier(req, supabase, options.identifier);
  
  // Skip rate limiting for service role
  if (identifier === 'user:service_role') {
    return {
      allowed: true,
      info: {
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 60000),
        currentCount: 0,
        windowStart: new Date(),
      },
      headers: {},
    };
  }

  const config = RATE_LIMIT_TIERS[options.tier];
  if (!config) {
    console.error(`[RateLimitMiddleware] Unknown tier: ${options.tier}`);
    // Fail-open for unknown tier
    return {
      allowed: true,
      info: {
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 60000),
        currentCount: 0,
        windowStart: new Date(),
      },
      headers: {},
    };
  }

  try {
    const limiter = new SlidingWindowRateLimiter(supabase, config);
    const info = await limiter.checkLimit(identifier, options.action);
    const headers = createRateLimitHeaders(info);

    if (!info.allowed) {
      // Log blocked request for monitoring
      console.warn('[RateLimitMiddleware] Request blocked:', {
        action: options.action,
        tier: options.tier,
        identifier: identifier.substring(0, 30) + '...',
        currentCount: info.currentCount,
        maxRequests: config.maxRequests,
        retryAfterMs: info.retryAfterMs,
      });

      return {
        allowed: false,
        info,
        headers,
        errorResponse: createRateLimitErrorResponse(info, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }),
      };
    }

    return {
      allowed: true,
      info,
      headers,
    };
  } catch (error) {
    // Fail-open on any error
    console.error('[RateLimitMiddleware] Error:', {
      error: error instanceof Error ? error.message : String(error),
      action: options.action,
      tier: options.tier,
    });

    return {
      allowed: true,
      info: {
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 60000),
        currentCount: 0,
        windowStart: new Date(),
      },
      headers: {},
    };
  }
}

/**
 * Rate limit middleware helper - returns error response if rate limited
 */
export async function applyRateLimit(
  req: Request,
  tier: RateLimitTier,
  action: string
): Promise<Response | null> {
  const result = await checkRateLimit(req, { tier, action });
  
  if (!result.allowed && result.errorResponse) {
    return result.errorResponse;
  }
  
  return null;
}

/**
 * Create a rate-limited request handler wrapper
 */
export function withRateLimit<T extends (req: Request) => Promise<Response>>(
  handler: T,
  tier: RateLimitTier,
  action: string
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const rateLimitResponse = await applyRateLimit(req, tier, action);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    const response = await handler(req);
    
    // Add rate limit headers to response
    const result = await checkRateLimit(req, { tier, action, skipRateLimit: true });
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(result.headers)) {
      newHeaders.set(key, value);
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}
