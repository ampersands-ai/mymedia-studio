import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const logger = new EdgeLogger('monitor-model-health', requestId, supabase, true);

    logger.info('Starting model health monitoring check');

    // Fetch alert settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['model_alerts_enabled', 'model_failure_threshold', 'model_failure_window_minutes']);

    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
    
    const alertsEnabled = settingsMap.get('model_alerts_enabled') === true;
    const failureThreshold = Number(settingsMap.get('model_failure_threshold')) || 3;
    const windowMinutes = Number(settingsMap.get('model_failure_window_minutes')) || 60;

    if (!alertsEnabled) {
      logger.info('Model alerts are disabled, skipping check');
      return new Response(
        JSON.stringify({ success: true, message: 'Alerts disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query model test results from the last window
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    
    const { data: recentTests, error } = await supabase
      .from('model_test_results')
      .select('model_record_id, status')
      .gte('test_started_at', windowStart);

    if (error) throw error;

    // Group by model and count failures
    const modelFailures = new Map<string, { total: number; failed: number; modelName?: string }>();
    
    for (const test of recentTests || []) {
      const current = modelFailures.get(test.model_record_id) || { total: 0, failed: 0 };
      current.total++;
      if (test.status === 'failed' || test.status === 'error' || test.status === 'timeout') {
        current.failed++;
      }
      modelFailures.set(test.model_record_id, current);
    }

    // Get model names for failing models
    const failingModelIds = Array.from(modelFailures.entries())
      .filter(([_, stats]) => stats.failed >= failureThreshold)
      .map(([id]) => id);

    if (failingModelIds.length === 0) {
      logger.info('No models exceeding failure threshold');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No failing models',
          stats: { totalModels: modelFailures.size, failingModels: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get model details
    const { data: models } = await supabase
      .from('ai_models')
      .select('record_id, model_name, provider')
      .in('record_id', failingModelIds);

    const modelMap = new Map(models?.map(m => [m.record_id, m]) || []);

    // Send alerts for each failing model
    const alerts = [];
    for (const [modelId, stats] of modelFailures.entries()) {
      if (stats.failed >= failureThreshold) {
        const model = modelMap.get(modelId);
        const failureRate = ((stats.failed / stats.total) * 100).toFixed(1);
        
        const alertPayload = {
          type: 'model_failure',
          severity: stats.failed >= failureThreshold * 2 ? 'critical' : 'warning',
          message: `Model "${model?.model_name}" has ${stats.failed} failures out of ${stats.total} tests (${failureRate}%) in the last ${windowMinutes} minutes`,
          metadata: {
            model_id: modelId,
            model_name: model?.model_name,
            provider: model?.provider,
            total_tests: stats.total,
            failed_tests: stats.failed,
            failure_rate: failureRate,
            window_minutes: windowMinutes
          }
        };

        logger.warn('Sending alert for failing model', { 
          metadata: { 
            modelName: model?.model_name, 
            failedTests: stats.failed 
          } 
        });
        
        const { data, error: alertError } = await supabase.functions.invoke('send-webhook-alert', {
          body: alertPayload
        });

        alerts.push({
          model: model?.model_name,
          sent: !alertError,
          error: alertError?.message
        });

        if (alertError) {
          logger.error('Failed to send model alert', alertError instanceof Error ? alertError : undefined, { 
            metadata: { modelName: model?.model_name } 
          });
        }
      }
    }

    logger.logDuration('Model health monitoring complete', startTime, { 
      metadata: { 
        totalModels: modelFailures.size, 
        failingModels: failingModelIds.length, 
        alertsSent: alerts.length 
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        stats: {
          totalModels: modelFailures.size,
          failingModels: failingModelIds.length,
          alertsSent: alerts.length
        },
        alerts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorRequestId = crypto.randomUUID();
    console.error('Error monitoring model health', error instanceof Error ? error.message : String(error));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
