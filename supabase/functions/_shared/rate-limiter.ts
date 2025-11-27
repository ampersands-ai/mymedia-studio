import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  blockMinutes: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: Date;
  blockedUntil?: Date;
}

// Default rate limit configurations
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  share_token_access: {
    maxAttempts: 30,      // 30 requests per window
    windowMinutes: 5,     // 5 minute window
    blockMinutes: 15      // 15 minute block
  },
  content_download: {
    maxAttempts: 20,
    windowMinutes: 10,
    blockMinutes: 30
  },
  api_call: {
    maxAttempts: 100,
    windowMinutes: 1,
    blockMinutes: 5
  }
};

/**
 * Check rate limit for an identifier and action
 * Returns whether the request is allowed and remaining attempts
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  action: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const rateLimitConfig = config || RATE_LIMIT_CONFIGS[action] || RATE_LIMIT_CONFIGS.api_call;
  const rateLimitKey = `${action}:${identifier}`;
  const now = new Date();

  // Fetch current rate limit status
  const { data: rateLimit, error: fetchError } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', rateLimitKey)
    .eq('action', action)
    .maybeSingle();

  if (fetchError) {
    // On error, allow the request but log
    console.error('Rate limit check failed:', fetchError);
    return { allowed: true, remaining: rateLimitConfig.maxAttempts };
  }

  // Check if currently blocked
  if (rateLimit?.blocked_until) {
    const blockedUntil = new Date(rateLimit.blocked_until);
    if (now < blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        blockedUntil
      };
    }
  }

  // First request or window expired - create/reset record
  if (!rateLimit) {
    await supabase
      .from('rate_limits')
      .insert({
        identifier: rateLimitKey,
        action,
        attempt_count: 1,
        first_attempt_at: now.toISOString(),
        last_attempt_at: now.toISOString()
      });

    return {
      allowed: true,
      remaining: rateLimitConfig.maxAttempts - 1,
      resetAt: new Date(now.getTime() + rateLimitConfig.windowMinutes * 60 * 1000)
    };
  }

  // Check if window has expired
  const firstAttempt = new Date(rateLimit.first_attempt_at);
  const windowExpired = (now.getTime() - firstAttempt.getTime()) > (rateLimitConfig.windowMinutes * 60 * 1000);

  if (windowExpired) {
    await supabase
      .from('rate_limits')
      .update({
        attempt_count: 1,
        first_attempt_at: now.toISOString(),
        last_attempt_at: now.toISOString(),
        blocked_until: null
      })
      .eq('identifier', rateLimitKey)
      .eq('action', action);

    return {
      allowed: true,
      remaining: rateLimitConfig.maxAttempts - 1,
      resetAt: new Date(now.getTime() + rateLimitConfig.windowMinutes * 60 * 1000)
    };
  }

  // Check if limit exceeded
  const newAttemptCount = rateLimit.attempt_count + 1;
  const isBlocked = newAttemptCount >= rateLimitConfig.maxAttempts;

  interface RateLimitUpdate {
    attempt_count: number;
    last_attempt_at: string;
    blocked_until?: string;
  }

  const updateData: RateLimitUpdate = {
    attempt_count: newAttemptCount,
    last_attempt_at: now.toISOString()
  };

  if (isBlocked) {
    updateData.blocked_until = new Date(now.getTime() + rateLimitConfig.blockMinutes * 60 * 1000).toISOString();
  }

  await supabase
    .from('rate_limits')
    .update(updateData)
    .eq('identifier', rateLimitKey)
    .eq('action', action);

  if (isBlocked) {
    return {
      allowed: false,
      remaining: 0,
      blockedUntil: new Date(updateData.blocked_until!)
    };
  }

  return {
    allowed: true,
    remaining: rateLimitConfig.maxAttempts - newAttemptCount,
    resetAt: new Date(firstAttempt.getTime() + rateLimitConfig.windowMinutes * 60 * 1000)
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(req: Request): string {
  // Check common headers for real IP (behind proxies)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to a hash of user-agent + accept-language for basic fingerprinting
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const acceptLang = req.headers.get('accept-language') || 'unknown';
  return `fingerprint:${hashString(userAgent + acceptLang)}`;
}

/**
 * Simple string hash for fingerprinting
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Create rate limit error response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  responseHeaders: HeadersInit
): Response {
  const retryAfter = result.blockedUntil 
    ? Math.ceil((result.blockedUntil.getTime() - Date.now()) / 1000)
    : 60;

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retry_after: retryAfter
    }),
    {
      status: 429,
      headers: {
        ...responseHeaders,
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': '0'
      }
    }
  );
}
