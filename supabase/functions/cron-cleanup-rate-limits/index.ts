/**
 * Cron Job: Cleanup Expired Rate Limits
 * 
 * This function should be scheduled to run daily to clean up
 * expired rate limit entries and prevent table bloat.
 * 
 * Schedule: Daily at 3 AM UTC
 * pg_cron expression: 0 3 * * *
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('cron-cleanup-rate-limits', requestId);
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    logger.info('Starting rate limits cleanup');

    // Clean up rate_limits_v2 table
    const { data: v2Deleted, error: v2Error } = await supabase
      .rpc('cleanup_expired_rate_limits');

    if (v2Error) {
      logger.warn('Error cleaning rate_limits_v2', { metadata: { error: v2Error.message } });
    } else {
      logger.info('Cleaned rate_limits_v2', { metadata: { deletedCount: v2Deleted } });
    }

    // Also clean old rate_limits entries (legacy table)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { error: legacyError } = await supabase
      .from('rate_limits')
      .delete()
      .lt('last_attempt', twentyFourHoursAgo);

    if (legacyError) {
      logger.warn('Error cleaning legacy rate_limits', { metadata: { error: legacyError.message } });
    }

    // Clean old circuit breaker events (keep last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: cbError } = await supabase
      .from('circuit_breaker_events')
      .delete()
      .lt('created_at', sevenDaysAgo);

    if (cbError) {
      logger.warn('Error cleaning circuit_breaker_events', { metadata: { error: cbError.message } });
    }

    // Clean old system metrics (keep last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: metricsError } = await supabase
      .from('system_metrics')
      .delete()
      .lt('recorded_at', thirtyDaysAgo);

    if (metricsError) {
      logger.warn('Error cleaning system_metrics', { metadata: { error: metricsError.message } });
    }

    const duration = Date.now() - startTime;
    logger.info('Rate limits cleanup completed', { 
      metadata: { 
        durationMs: duration,
        v2Deleted: v2Deleted || 0
      } 
    });

    // Record cleanup metric
    await supabase.rpc('record_metric', {
      p_name: 'rate_limit_cleanup_duration_ms',
      p_value: duration,
      p_unit: 'milliseconds',
      p_tags: { v2_deleted: v2Deleted || 0 }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cleanup completed',
        v2Deleted: v2Deleted || 0,
        durationMs: duration,
      }),
      { 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    logger.error('Rate limits cleanup failed', error as Error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
