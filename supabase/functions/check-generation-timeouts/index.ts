
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking for generation timeouts...');

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
      throw queryError;
    }

    console.log(`Found ${stuckGenerations?.length || 0} stuck generations`);

    if (!stuckGenerations || stuckGenerations.length === 0) {
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

        console.log(`Sending alert for generation ${gen.id} (${elapsedMinutes} minutes)`);

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

    console.log(`Alerts sent: ${successCount} success, ${failureCount} failures`);

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
    console.error('Error in check-generation-timeouts function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
