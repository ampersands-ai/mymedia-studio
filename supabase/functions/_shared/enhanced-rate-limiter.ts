/**
 * Enhanced Rate Limiter with Sliding Window Algorithm
 * Provides more accurate rate limiting compared to fixed window approach
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

// Pre-configured rate limit tiers
export const RATE_LIMIT_TIERS: Record<string, SlidingWindowConfig> = {
  // Strict tier for sensitive operations
  strict: {
    maxRequests: 10,
    windowMs: 60 * 1000,      // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'strict',
  },
  // Standard tier for normal API calls
  standard: {
    maxRequests: 100,
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
  // Generation tier for content generation
  generation: {
    maxRequests: 20,
    windowMs: 60 * 1000,      // 1 minute
    blockDurationMs: 2 * 60 * 1000, // 2 minutes
    keyPrefix: 'gen',
  },
  // Authentication tier
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000,      // 1 minute
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'auth',
  },
};

/**
 * Sliding Window Rate Limiter
 * Uses a hybrid sliding window algorithm for more accurate rate limiting
 */
export class SlidingWindowRateLimiter {
  private supabase: SupabaseClient;
  private config: SlidingWindowConfig;
  private tableName = 'rate_limits_v2';

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
   */
  async checkLimit(identifier: string, action: string): Promise<RateLimitInfo> {
    const key = this.generateKey(identifier, action);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Try to use the new v2 table, fall back to v1 if it doesn't exist
      const { data: record, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (error) {
        // Fall back to allowing the request if table doesn't exist
        if (error.code === '42P01') {
          console.warn('rate_limits_v2 table not found, allowing request');
          return this.createAllowedResponse(now);
        }
        throw error;
      }

      // No existing record - first request
      if (!record) {
        await this.createRecord(key, now);
        return this.createAllowedResponse(now, this.config.maxRequests - 1);
      }

      // Check if currently blocked
      if (record.blocked_until && new Date(record.blocked_until).getTime() > now) {
        const blockedUntil = new Date(record.blocked_until);
        return {
          allowed: false,
          remaining: 0,
          resetAt: blockedUntil,
          retryAfterMs: blockedUntil.getTime() - now,
          currentCount: record.request_count,
          windowStart: new Date(record.window_start),
        };
      }

      // Parse request timestamps from the sliding window
      const timestamps: number[] = record.request_timestamps || [];
      
      // Filter to only include timestamps within the current window
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      
      // Check if we're at the limit
      if (validTimestamps.length >= this.config.maxRequests) {
        // Block the user
        await this.blockUser(key, now);
        
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(now + this.config.blockDurationMs),
          retryAfterMs: this.config.blockDurationMs,
          currentCount: validTimestamps.length,
          windowStart: new Date(windowStart),
        };
      }

      // Add current timestamp and update record
      validTimestamps.push(now);
      await this.updateRecord(key, validTimestamps, now);

      const remaining = this.config.maxRequests - validTimestamps.length;
      const oldestTimestamp = validTimestamps[0] || now;
      const resetAt = new Date(oldestTimestamp + this.config.windowMs);

      return {
        allowed: true,
        remaining,
        resetAt,
        currentCount: validTimestamps.length,
        windowStart: new Date(windowStart),
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // On error, allow the request but log the issue
      return this.createAllowedResponse(now);
    }
  }

  /**
   * Create a new rate limit record
   */
  private async createRecord(key: string, timestamp: number): Promise<void> {
    await this.supabase
      .from(this.tableName)
      .upsert({
        key,
        request_count: 1,
        request_timestamps: [timestamp],
        window_start: new Date(timestamp).toISOString(),
        last_request_at: new Date(timestamp).toISOString(),
        blocked_until: null,
      });
  }

  /**
   * Update existing rate limit record
   */
  private async updateRecord(key: string, timestamps: number[], now: number): Promise<void> {
    await this.supabase
      .from(this.tableName)
      .update({
        request_count: timestamps.length,
        request_timestamps: timestamps,
        last_request_at: new Date(now).toISOString(),
      })
      .eq('key', key);
  }

  /**
   * Block a user after exceeding rate limit
   */
  private async blockUser(key: string, now: number): Promise<void> {
    await this.supabase
      .from(this.tableName)
      .update({
        blocked_until: new Date(now + this.config.blockDurationMs).toISOString(),
      })
      .eq('key', key);
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
    await this.supabase
      .from(this.tableName)
      .delete()
      .eq('key', key);
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(identifier: string, action: string): Promise<RateLimitInfo | null> {
    const key = this.generateKey(identifier, action);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const { data: record, error } = await this.supabase
      .from(this.tableName)
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
 * Create rate limit error response
 */
export function createRateLimitErrorResponse(
  info: RateLimitInfo,
  additionalHeaders?: Record<string, string>
): Response {
  const headers = {
    ...createRateLimitHeaders(info),
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: info.retryAfterMs ? Math.ceil(info.retryAfterMs / 1000) : 60,
      resetAt: info.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers,
    }
  );
}
