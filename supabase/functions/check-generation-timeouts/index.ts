import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getModelConfig } from "../_shared/registry/index.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('check-generation-timeouts', requestId);
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    logger.info('Starting generation timeout check');

    // Find generations that have been processing for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: stuckGenerations, error: queryError } = await supabase
      .from('generations')
      .select('id, user_id, status, created_at, prompt, model_record_id')
      .eq('status', GENERATION_STATUS.PROCESSING)
      .lt('created_at', fiveMinutesAgo);

    if (queryError) {
      logger.error('Failed to query stuck generations', queryError);
      throw queryError;
    }

    const stuckCount = stuckGenerations?.length || 0;
    logger.info(`Found ${stuckCount} stuck generation(s)`, { metadata: { stuckCount } });

    if (!stuckGenerations || stuckGenerations.length === 0) {
      logger.logDuration('Timeout check completed', startTime);
      return new Response(
        JSON.stringify({ message: 'No stuck generations found', count: 0 }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which ones have already been alerted
    const { data: alreadyAlerted } = await supabase
      .from('audit_logs')
      .select('metadata')
      .eq('action', 'generation_timeout_alert');

    const alertedIds = new Set(
      alreadyAlerted
        ?.map(log => {
          const meta = log.metadata as any;
          return meta?.generation_id;
        })
        .filter(id => stuckGenerations.some(g => g.id === id)) || []
    );

    // Get user emails for notifications
    const userIds = [...new Set(stuckGenerations.map(g => g.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);
    
    const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

    // Send alerts for new stuck generations
    const alertPromises = stuckGenerations
      .filter(gen => !alertedIds.has(gen.id))
      .map(async (gen) => {
        const elapsedMinutes = Math.floor(
          (Date.now() - new Date(gen.created_at).getTime()) / (60 * 1000)
        );

        // ADR 007: Get model metadata from registry
        let modelName = 'Unknown';
        let provider = 'Unknown';
        try {
          const modelConfig = await getModelConfig(gen.model_record_id);
          modelName = modelConfig.modelName;
          provider = modelConfig.provider;
        } catch (e) {
          logger.error('Failed to load model from registry', e instanceof Error ? e : new Error(String(e)), {
            metadata: {
              generation_id: gen.id,
              model_record_id: gen.model_record_id
            }
          });
        }

        logger.info(`Sending timeout alert for generation`, {
          metadata: {
            generationId: gen.id,
            elapsedMinutes,
            userId: gen.user_id
          }
        });

        return supabase.functions.invoke('send-generation-timeout-alert', {
          body: {
            generation_id: gen.id,
            user_id: gen.user_id,
            elapsed_minutes: elapsedMinutes,
            model_name: modelName,
            provider: provider,
            user_email: emailMap.get(gen.user_id),
            prompt: gen.prompt,
          }
        });
      });

    const results = await Promise.allSettled(alertPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    logger.info('Alert sending completed', {
      metadata: { successCount, failureCount, totalChecked: stuckCount }
    });

    logger.logDuration('Timeout check completed', startTime);

    return new Response(
      JSON.stringify({ 
        success: true,
        checked: stuckGenerations.length,
        alerts_sent: successCount,
        failures: failureCount
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logger.error('Fatal error in timeout check', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
