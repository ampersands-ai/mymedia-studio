/**
 * Enhanced Webhook Health Monitor v2
 * Automated health checks with multi-criteria alerting
 * 
 * Checks:
 * 1. Consecutive failures (>5 in a row)
 * 2. Success rate in last hour (<90%)
 * 3. Average response time (>10s)
 * 4. No successful webhook in 30+ minutes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertConfig {
  provider: string;
  failure_threshold: number;
  timeout_threshold_ms: number;
  success_rate_threshold: number;
  alert_cooldown_minutes: number;
  enabled: boolean;
}

interface HealthIssue {
  provider: string;
  alert_type: string;
  severity: 'warning' | 'critical';
  details: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('monitor-webhook-health-v2', requestId);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    logger.info('Starting webhook health check', { requestId });

    // Fetch alert configurations
    const { data: configs, error: configError } = await supabase
      .from('webhook_alert_config')
      .select('*')
      .eq('enabled', true);

    if (configError) {
      logger.error('Failed to fetch alert configs', configError);
      throw configError;
    }

    if (!configs || configs.length === 0) {
      logger.info('No enabled alert configurations found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No enabled configurations',
          checks_performed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info(`Checking health for ${configs.length} providers`, {
      metadata: { providers: configs.map(c => c.provider) }
    });

    const issues: HealthIssue[] = [];
    const checksPerformed = configs.length;

    for (const config of configs as AlertConfig[]) {
      const providerIssues = await checkProviderHealth(supabase, config, logger);
      issues.push(...providerIssues);
    }

    logger.info('Health check completed', {
      duration: Date.now() - startTime,
      metadata: {
        total_checks: checksPerformed,
        issues_found: issues.length
      }
    });

    // Send alerts for any issues found
    if (issues.length > 0) {
      await sendHealthAlerts(supabase, issues, logger);
    }

    logger.logDuration('health_check', startTime, {
      metadata: {
        checks_performed: checksPerformed,
        issues_found: issues.length
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        checks_performed: checksPerformed,
        issues_found: issues.length,
        issues: issues,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Webhook health check failed', error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: 'Health check failed',
        message: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function checkProviderHealth(
  supabase: any,
  config: AlertConfig,
  logger: EdgeLogger
): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  logger.info(`Checking ${config.provider}`, { metadata: { config } });

  try {
    // Fetch recent webhook events for this provider
    const { data: events, error } = await supabase
      .from('webhook_analytics')
      .select('*')
      .eq('provider', config.provider)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!events || events.length === 0) {
      // CHECK 4: No activity in last hour
      logger.warn(`No webhook activity for ${config.provider} in last hour`);
      issues.push({
        provider: config.provider,
        alert_type: 'no_activity',
        severity: 'warning',
        details: {
          message: `No webhook events received in the last hour`,
          last_checked: now.toISOString()
        }
      });
      return issues;
    }

    const totalEvents = events.length;
    const successfulEvents = events.filter((e: any) => e.status === 'success').length;
    const failedEvents = events.filter((e: any) => e.status === 'failure').length;
    const successRate = totalEvents > 0 ? successfulEvents / totalEvents : 0;

    logger.info(`${config.provider} metrics`, {
      metadata: {
        total: totalEvents,
        successful: successfulEvents,
        failed: failedEvents,
        success_rate: successRate
      }
    });

    // CHECK 1: Consecutive failures
    let consecutiveFailures = 0;
    for (const event of events) {
      if (event.status === 'failure') {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    if (consecutiveFailures >= config.failure_threshold) {
      logger.warn(`${config.provider}: ${consecutiveFailures} consecutive failures`);
      issues.push({
        provider: config.provider,
        alert_type: 'consecutive_failures',
        severity: 'critical',
        details: {
          consecutive_failures: consecutiveFailures,
          threshold: config.failure_threshold,
          recent_errors: events
            .filter((e: any) => e.status === 'failure')
            .slice(0, 5)
            .map((e: any) => ({
              error_code: e.error_code,
              created_at: e.created_at
            }))
        }
      });
    }

    // CHECK 2: Low success rate
    if (successRate < config.success_rate_threshold) {
      logger.warn(`${config.provider}: Low success rate ${(successRate * 100).toFixed(1)}%`);
      issues.push({
        provider: config.provider,
        alert_type: 'low_success_rate',
        severity: 'critical',
        details: {
          success_rate: successRate,
          threshold: config.success_rate_threshold,
          total_events: totalEvents,
          successful_events: successfulEvents,
          failed_events: failedEvents,
          time_window: '1 hour'
        }
      });
    }

    // CHECK 3: High latency
    const successfulWithDuration = events.filter((e: any) => 
      e.status === 'success' && e.duration_ms != null
    );
    
    if (successfulWithDuration.length > 0) {
      const avgDuration = successfulWithDuration.reduce(
        (sum: number, e: any) => sum + e.duration_ms, 
        0
      ) / successfulWithDuration.length;

      if (avgDuration > config.timeout_threshold_ms) {
        logger.warn(`${config.provider}: High latency ${avgDuration.toFixed(0)}ms`);
        issues.push({
          provider: config.provider,
          alert_type: 'high_latency',
          severity: 'warning',
          details: {
            avg_duration_ms: Math.round(avgDuration),
            threshold_ms: config.timeout_threshold_ms,
            sample_size: successfulWithDuration.length
          }
        });
      }
    }

    // CHECK 4: No successful webhooks in last 30 minutes (but there is activity)
    const recentSuccessfulEvents = events.filter((e: any) => 
      e.status === 'success' && 
      new Date(e.created_at) >= thirtyMinutesAgo
    );

    if (totalEvents > 0 && recentSuccessfulEvents.length === 0) {
      logger.warn(`${config.provider}: No successful webhooks in 30 minutes`);
      issues.push({
        provider: config.provider,
        alert_type: 'no_success',
        severity: 'critical',
        details: {
          message: 'No successful webhooks in the last 30 minutes',
          total_events_in_period: totalEvents,
          failed_events_in_period: failedEvents
        }
      });
    }

  } catch (error) {
    logger.error(`Failed to check ${config.provider}`, error as Error);
  }

  return issues;
}

async function sendHealthAlerts(
  supabase: any,
  issues: HealthIssue[],
  logger: EdgeLogger
): Promise<void> {
  logger.info(`Sending alerts for ${issues.length} issues`);

  for (const issue of issues) {
    try {
      // Check if we recently sent an alert for this provider (cooldown)
      const cooldownMinutes = 30;
      const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000);

      const { data: recentAlerts } = await supabase
        .from('webhook_health_alerts')
        .select('id')
        .eq('provider', issue.provider)
        .eq('alert_type', issue.alert_type)
        .gte('created_at', cooldownTime.toISOString())
        .is('resolved_at', null);

      if (recentAlerts && recentAlerts.length > 0) {
        logger.info(`Skipping alert for ${issue.provider} - in cooldown period`);
        continue;
      }

      // Insert alert history
      const { error: insertError } = await supabase
        .from('webhook_health_alerts')
        .insert({
          provider: issue.provider,
          alert_type: issue.alert_type,
          severity: issue.severity,
          details: issue.details
        })
        .select()
        .single();

      if (insertError) {
        logger.error('Failed to insert alert history', insertError instanceof Error ? insertError : new Error(insertError?.message || 'Database error'));
        continue;
      }

      // Send alert via webhook alert system
      const alertPayload = {
        type: 'webhook_health',
        provider: issue.provider,
        alert_type: issue.alert_type,
        severity: issue.severity,
        details: issue.details,
        timestamp: new Date().toISOString()
      };

      const { error: alertError } = await supabase.functions.invoke(
        'send-webhook-alert',
        { body: alertPayload }
      );

      if (alertError) {
        logger.error('Failed to send alert', alertError);
      } else {
        logger.info(`Alert sent for ${issue.provider}: ${issue.alert_type}`);
      }

    } catch (error) {
      logger.error(`Failed to process alert for ${issue.provider}`, error as Error);
    }
  }
}
