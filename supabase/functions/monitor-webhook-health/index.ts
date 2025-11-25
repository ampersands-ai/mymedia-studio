import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const logger = new EdgeLogger('monitor-webhook-health', requestId, supabase, true);

  try {

    logger.info('Starting webhook health monitoring check');

    // Get alert settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'webhook_alerts')
      .maybeSingle();

    if (settingsError) throw settingsError;

    const settings = settingsData?.setting_value as any;

    if (!settings?.enabled) {
      logger.info('Alerts are disabled, skipping check');
      return new Response(
        JSON.stringify({ message: 'Alerts disabled' }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.debug('Alert settings loaded', { metadata: settings });

    // Check time window (last hour)
    const timeWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Fetch webhook statistics
    const { data: webhooks, error: webhookError } = await supabase
      .from('generations')
      .select('status, provider_response')
      .not('provider_task_id', 'is', null)
      .gte('created_at', timeWindow);

    if (webhookError) throw webhookError;

    const totalWebhooks = webhooks.length;
    const completedCount = webhooks.filter(g => g.status === GENERATION_STATUS.COMPLETED).length;
    const failedCount = webhooks.filter(g => g.status === GENERATION_STATUS.FAILED).length;
    const failureRate = totalWebhooks > 0 ? (failedCount / totalWebhooks) * 100 : 0;

    logger.info('Webhook statistics calculated', { 
      metadata: { 
        total: totalWebhooks, 
        failed: failedCount, 
        failureRate: failureRate.toFixed(1) 
      } 
    });

    // Count storage failures
    const storageFailures = webhooks.filter(g => {
      if (g.status !== GENERATION_STATUS.FAILED) return false;
      const response = g.provider_response as any;
      const errorMsg = (response?.error || response?.storage_error || '').toLowerCase();
      return errorMsg.includes('storage') || errorMsg.includes('upload') || errorMsg.includes('bucket');
    }).length;

    logger.debug('Storage failures counted', { metadata: { storageFailures } });

    const alerts = [];

    // Check failure rate threshold
    if (failureRate >= settings.failure_rate_threshold && totalWebhooks >= 10) {
      logger.warn('Failure rate alert triggered', { 
        metadata: { 
          failureRate: failureRate.toFixed(1), 
          threshold: settings.failure_rate_threshold 
        } 
      });
      alerts.push({
        type: 'failure_rate',
        message: `Webhook failure rate has exceeded ${settings.failure_rate_threshold}%. Current rate: ${failureRate.toFixed(1)}%`,
        failureRate: Math.round(failureRate),
        threshold: settings.failure_rate_threshold,
        details: {
          total: totalWebhooks,
          failed: failedCount,
          completed: completedCount,
        },
      });
    }

    // Check storage failure threshold
    if (storageFailures >= settings.storage_failure_threshold) {
      logger.warn('Storage failure alert triggered', { 
        metadata: { 
          storageFailures, 
          threshold: settings.storage_failure_threshold 
        } 
      });
      alerts.push({
        type: 'storage_spike',
        message: `Storage failures have spiked to ${storageFailures} in the last hour. Threshold: ${settings.storage_failure_threshold}`,
        storageFailures,
        threshold: settings.storage_failure_threshold,
        details: {
          time_window: '1 hour',
          total_webhooks: totalWebhooks,
        },
      });
    }

    // Send alerts if any
    if (alerts.length > 0) {
      logger.info('Sending alerts', { metadata: { count: alerts.length } });
      
      for (const alert of alerts) {
        try {
          const { error: alertError } = await supabase.functions.invoke('send-webhook-alert', {
            body: alert,
          });

          if (alertError) {
            logger.error(`Failed to send ${alert.type} alert`, alertError instanceof Error ? alertError : undefined, { 
              metadata: { alertType: alert.type } 
            });
          } else {
            logger.info(`Alert sent successfully`, { metadata: { alertType: alert.type } });
          }
        } catch (err) {
          logger.error(`Error sending ${alert.type} alert`, err instanceof Error ? err : undefined, { 
            metadata: { alertType: alert.type } 
          });
        }
      }
    } else {
      logger.info('All thresholds within normal range');
    }

    logger.logDuration('Webhook health monitoring complete', startTime, { 
      metadata: { 
        totalWebhooks, 
        failureRate: Math.round(failureRate), 
        alertsSent: alerts.length 
      } 
    });

    return new Response(
      JSON.stringify({
        success: true,
        checked_at: new Date().toISOString(),
        stats: {
          total: totalWebhooks,
          failed: failedCount,
          failure_rate: Math.round(failureRate),
          storage_failures: storageFailures,
        },
        alerts_sent: alerts.length,
        thresholds: {
          failure_rate: settings.failure_rate_threshold,
          storage_failures: settings.storage_failure_threshold,
        },
      }),
      {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    logger.error('Error in monitor-webhook-health', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
