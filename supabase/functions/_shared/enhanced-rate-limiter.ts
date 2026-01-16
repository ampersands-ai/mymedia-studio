/**
 * Enhanced Rate Limiter with Atomic PostgreSQL Function
 * 
 * Production-grade rate limiting that eliminates race conditions
 * by using pg_advisory_xact_lock in a single database transaction.
 * 
 * Features:
 * - Atomic check-and-update via PostgreSQL function
 * - Sliding window algorithm for accurate limiting
 * - Advisory locks prevent TOCTOU race conditions
 * - Fail-open design for reliability
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SlidingWindowConfig {
  maxRequests: number;       // Maximum requests allowed in window
  windowMs: number;          // Window size in milliseconds
  blockDurationMs: number;   // How long to block after exceeding limit
  keyPrefix?: string;        // Prefix for rate limit keys
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
  currentCount: number;
  windowStart: Date;
}

export interface RateLimitTier {
  name: string;
  config: SlidingWindowConfig;
}

// Pre-configured rate limit tiers with production-safe limits
export const RATE_LIMIT_TIERS: Record<string, SlidingWindowConfig> = {
  // Strict tier for sensitive operations (increased from 10 to 30)
  strict: {
    maxRequests: 30,
    windowMs: 60 * 1000,      // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'strict',
  },
  // Standard tier for normal API calls (increased from 100 to 200)
  standard: {
    maxRequests: 200,
    windowMs: 60 * 1000,      // 1 minute
    blockDurationMs: 60 * 1000, // 1 minute
    keyPrefix: 'standard',
  },
  // Relaxed tier for read operations
  relaxed: {
    maxRequests: 300,
    windowMs: 60 * 1000,      // 1 minute
    blockDurationMs: 30 * 1000, // 30 seconds
    keyPrefix: 'relaxed',
  },
  // Burst tier for short burst allowances
  burst: {
    maxRequests: 50,
    windowMs: 10 * 1000,      // 10 seconds
    blockDurationMs: 30 * 1000, // 30 seconds
    keyPrefix: 'burst',
  },
  // Generation tier for content generation (increased from 20 to 50)
  generation: {
    maxRequests: 50,
    windowMs: 60 * 1000,      // 1 minute
    blockDurationMs: 2 * 60 * 1000, // 2 minutes
    keyPrefix: 'gen',
  },
  // Authentication tier
  auth: {
    maxRequests: 10,
    windowMs: 60 * 1000,      // 1 minute
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'auth',
  },
};

/**
 * Atomic Rate Limiter using PostgreSQL function
 * Uses pg_advisory_xact_lock to prevent race conditions
 */
export class SlidingWindowRateLimiter {
  private supabase: SupabaseClient;
  private config: SlidingWindowConfig;

  constructor(supabase: SupabaseClient, config: SlidingWindowConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(identifier: string, action: string): string {
    const prefix = this.config.keyPrefix || 'rl';
    return `${prefix}:${action}:${identifier}`;
  }

  /**
   * Check if request is allowed under rate limit
   * Uses atomic PostgreSQL function to eliminate race conditions
   */
  async checkLimit(identifier: string, action: string): Promise<RateLimitInfo> {
    const key = this.generateKey(identifier, action);
    const now = Date.now();

    try {
      // Call atomic PostgreSQL function
      const { data, error } = await this.supabase.rpc('check_rate_limit_atomic', {
        p_key: key,
        p_max_requests: this.config.maxRequests,
        p_window_ms: this.config.windowMs,
        p_block_duration_ms: this.config.blockDurationMs,
      });

      if (error) {
        // Log the error for debugging
        console.error('[RateLimiter] Atomic function error:', {
          error: error.message,
          code: error.code,
          key,
          action,
          identifier: identifier.substring(0, 20) + '...',
        });

        // Fail-open: allow the request if the function fails
        return this.createAllowedResponse(now);
      }

      // Handle empty or null response
      if (!data || data.length === 0) {
        console.warn('[RateLimiter] Empty response from atomic function, allowing request');
        return this.createAllowedResponse(now);
      }

      const result = data[0];

      // Log rate limit check for debugging (only when blocked or near limit)
      if (!result.allowed || result.remaining <= 5) {
        console.log('[RateLimiter] Check result:', {
          key,
          allowed: result.allowed,
          remaining: result.remaining,
          currentCount: result.current_count,
          blocked: result.blocked,
          maxRequests: this.config.maxRequests,
        });
      }

      if (!result.allowed) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(result.reset_at),
          retryAfterMs: Number(result.retry_after_ms),
          currentCount: result.current_count,
          windowStart: new Date(now - this.config.windowMs),
        };
      }

      return {
        allowed: true,
        remaining: result.remaining,
        resetAt: new Date(result.reset_at),
        currentCount: result.current_count,
        windowStart: new Date(now - this.config.windowMs),
      };
    } catch (error) {
      // Fail-open: allow the request on any unexpected error
      console.error('[RateLimiter] Unexpected error:', {
        error: error instanceof Error ? error.message : String(error),
        key,
        action,
      });
      return this.createAllowedResponse(now);
    }
  }

  /**
   * Create an allowed response with default values
   */
  private createAllowedResponse(now: number, remaining?: number): RateLimitInfo {
    return {
      allowed: true,
      remaining: remaining ?? this.config.maxRequests - 1,
      resetAt: new Date(now + this.config.windowMs),
      currentCount: remaining !== undefined ? this.config.maxRequests - remaining : 1,
      windowStart: new Date(now),
    };
  }

  /**
   * Manually reset rate limit for a user
   */
  async resetLimit(identifier: string, action: string): Promise<void> {
    const key = this.generateKey(identifier, action);
    
    try {
      const { error } = await this.supabase.rpc('reset_rate_limit', { p_key: key });
      
      if (error) {
        console.error('[RateLimiter] Reset failed:', error.message);
      } else {
        console.log('[RateLimiter] Rate limit reset for key:', key);
      }
    } catch (error) {
      console.error('[RateLimiter] Reset error:', error);
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(identifier: string, action: string): Promise<RateLimitInfo | null> {
    const key = this.generateKey(identifier, action);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      const { data: record, error } = await this.supabase
        .from('rate_limits_v2')
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (error || !record) return null;

      const timestamps: number[] = record.request_timestamps || [];
      const validTimestamps = timestamps.filter(ts => ts > windowStart);

      return {
        allowed: validTimestamps.length < this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - validTimestamps.length),
        resetAt: validTimestamps.length > 0 
          ? new Date(validTimestamps[0] + this.config.windowMs)
          : new Date(now + this.config.windowMs),
        currentCount: validTimestamps.length,
        windowStart: new Date(windowStart),
      };
    } catch (error) {
      console.error('[RateLimiter] getStatus error:', error);
      return null;
    }
  }
}

/**
 * Create rate limiter with predefined tier
 */
export function createRateLimiter(
  supabase: SupabaseClient,
  tier: keyof typeof RATE_LIMIT_TIERS
): SlidingWindowRateLimiter {
  const config = RATE_LIMIT_TIERS[tier];
  if (!config) {
    throw new Error(`Unknown rate limit tier: ${tier}`);
  }
  return new SlidingWindowRateLimiter(supabase, config);
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': info.remaining.toString(),
    'X-RateLimit-Remaining': Math.max(0, info.remaining).toString(),
    'X-RateLimit-Reset': Math.floor(info.resetAt.getTime() / 1000).toString(),
  };

  if (!info.allowed && info.retryAfterMs) {
    headers['Retry-After'] = Math.ceil(info.retryAfterMs / 1000).toString();
  }

  return headers;
}

/**
 * Create rate limit error response with countdown data for frontend
 */
export function createRateLimitErrorResponse(
  info: RateLimitInfo,
  additionalHeaders?: Record<string, string>
): Response {
  const retryAfterSeconds = info.retryAfterMs ? Math.ceil(info.retryAfterMs / 1000) : 60;
  const minutes = Math.floor(retryAfterSeconds / 60);
  const seconds = retryAfterSeconds % 60;
  
  // Build human-readable time message
  let displayText: string;
  if (minutes > 0 && seconds > 0) {
    displayText = `${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    displayText = `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    displayText = `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const headers = {
    ...createRateLimitHeaders(info),
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${displayText}.`,
      retryAfter: retryAfterSeconds,
      retryAfterMs: info.retryAfterMs,
      resetAt: info.resetAt.toISOString(),
      // Frontend countdown data
      countdown: {
        seconds: retryAfterSeconds,
        displayText,
        resetAtTimestamp: info.resetAt.getTime(),
      },
    }),
    {
      status: 429,
      headers,
    }
  );
}
