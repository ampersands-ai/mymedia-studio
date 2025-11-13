import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('check-generation-timeouts', requestId);
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
      .select(`
        id, 
        user_id, 
        status, 
        created_at, 
        prompt,
        model_record_id,
        ai_models!inner(
          model_name,
          provider
        )
      `)
      .eq('status', 'processing')
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
            model_name: (gen as any).ai_models?.model_name || 'Unknown',
            provider: (gen as any).ai_models?.provider || 'Unknown',
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logger.error('Fatal error in timeout check', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
