import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting webhook health monitoring check...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get alert settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'webhook_alerts')
      .maybeSingle();

    if (settingsError) throw settingsError;

    const settings = settingsData?.setting_value as any;

    if (!settings?.enabled) {
      console.log('⏸️ Alerts are disabled, skipping check');
      return new Response(
        JSON.stringify({ message: 'Alerts disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('⚙️ Alert settings:', settings);

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
    const completedCount = webhooks.filter(g => g.status === 'completed').length;
    const failedCount = webhooks.filter(g => g.status === 'failed').length;
    const failureRate = totalWebhooks > 0 ? (failedCount / totalWebhooks) * 100 : 0;

    console.log(`📊 Stats: ${totalWebhooks} total, ${failedCount} failed, ${failureRate.toFixed(1)}% failure rate`);

    // Count storage failures
    const storageFailures = webhooks.filter(g => {
      if (g.status !== 'failed') return false;
      const response = g.provider_response as any;
      const errorMsg = (response?.error || response?.storage_error || '').toLowerCase();
      return errorMsg.includes('storage') || errorMsg.includes('upload') || errorMsg.includes('bucket');
    }).length;

    console.log(`💾 Storage failures: ${storageFailures}`);

    const alerts = [];

    // Check failure rate threshold
    if (failureRate >= settings.failure_rate_threshold && totalWebhooks >= 10) {
      console.log(`🚨 Failure rate alert triggered: ${failureRate.toFixed(1)}% >= ${settings.failure_rate_threshold}%`);
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
      console.log(`⚠️ Storage failure alert triggered: ${storageFailures} >= ${settings.storage_failure_threshold}`);
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
      console.log(`📧 Sending ${alerts.length} alert(s)...`);
      
      for (const alert of alerts) {
        try {
          const { error: alertError } = await supabase.functions.invoke('send-webhook-alert', {
            body: alert,
          });

          if (alertError) {
            console.error(`Failed to send ${alert.type} alert:`, alertError);
          } else {
            console.log(`✅ ${alert.type} alert sent successfully`);
          }
        } catch (err) {
          console.error(`Error sending ${alert.type} alert:`, err);
        }
      }
    } else {
      console.log('✅ All thresholds within normal range');
    }

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Error in monitor-webhook-health:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
