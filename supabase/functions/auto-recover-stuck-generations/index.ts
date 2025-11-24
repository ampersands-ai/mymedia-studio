import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { webhookLogger } from "../_shared/logger.ts";
import { getProviderConfig } from "../_shared/providers/registry.ts";
import { getModelConfig } from "../_shared/registry/index.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    webhookLogger.info('Auto-recovery started', {});
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find generations stuck in 'processing' for more than 3 minutes
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    const { data: stuckGenerations, error } = await supabase
      .from('generations')
      .select('id, provider_task_id, created_at, model_record_id')
      .eq('status', GENERATION_STATUS.PROCESSING)
      .not('provider_task_id', 'is', null)
      .lt('created_at', threeMinutesAgo)
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      webhookLogger.error('Query failed', error, {});
      return new Response(
        JSON.stringify({ error: 'Failed to query stuck generations' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stuckGenerations || stuckGenerations.length === 0) {
      webhookLogger.info('No stuck generations found', {});
      return new Response(
        JSON.stringify({
          message: 'No stuck generations found',
          checked_at: new Date().toISOString()
        }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webhookLogger.info(`Found stuck generations`, { count: stuckGenerations.length });

    const results = {
      total: stuckGenerations.length,
      recovered: 0,
      still_processing: 0,
      failed: 0,
      no_recovery: 0,
      generations: [] as any[]
    };

    // Process each stuck generation using unified recovery
    for (const generation of stuckGenerations) {
      // ADR 007: Get provider from model registry
      let provider = 'unknown';
      try {
        const modelConfig = await getModelConfig(generation.model_record_id);
        provider = modelConfig.provider;
      } catch (e) {
        webhookLogger.error('Failed to load model from registry', e instanceof Error ? e : new Error(String(e)), {
          generationId: generation.id,
          model_record_id: generation.model_record_id
        });
      }
      
      webhookLogger.info('Attempting recovery', { 
        generationId: generation.id,
        provider 
      });
      
      try {
        const providerConfig = getProviderConfig(provider);
        
        // Check if provider supports recovery
        if (!providerConfig?.recovery) {
          webhookLogger.info('No recovery support', {
            generationId: generation.id,
            provider
          });
          results.no_recovery++;
          results.generations.push({
            id: generation.id,
            provider,
            status: 'no_recovery_support'
          });
          continue;
        }

        // Call unified recovery router
        const { data: recoveryResult, error: recoveryError } = await supabase.functions.invoke(
          'recover-generation',
          {
            body: { generation_id: generation.id }
          }
        );

        if (recoveryError) {
          webhookLogger.error('Recovery failed', recoveryError, { 
            generationId: generation.id 
          });
          results.failed++;
          results.generations.push({
            id: generation.id,
            provider,
            status: 'failed',
            error: recoveryError.message
          });
        } else if (recoveryResult?.success) {
          results.recovered++;
          results.generations.push({
            id: generation.id,
            provider,
            status: 'recovered'
          });
          webhookLogger.success(generation.id, { recovered: true });
        } else {
          results.still_processing++;
          results.generations.push({
            id: generation.id,
            provider,
            status: 'still_processing'
          });
          webhookLogger.info('Still processing', { generationId: generation.id });
        }
      } catch (err) {
        webhookLogger.error('Exception during recovery', err, { 
          generationId: generation.id 
        });
        results.failed++;
        results.generations.push({
          id: generation.id,
          provider,
          status: 'error',
          error: (err as Error).message || String(err)
        });
      }
    }

    webhookLogger.info('Recovery complete', { 
      recovered: results.recovered,
      stillProcessing: results.still_processing,
      failed: results.failed,
      noRecovery: results.no_recovery
    });

    return new Response(
      JSON.stringify(results),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    webhookLogger.error('Auto-recovery failed', error as Error, {});
    const err = error as Error;
    return new Response(
      JSON.stringify({ 
        error: 'Auto-recovery failed',
        message: err.message || String(error)
      }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
