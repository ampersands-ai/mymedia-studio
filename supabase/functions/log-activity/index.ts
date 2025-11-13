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

  const logger = new EdgeLogger('log-activity', requestId);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from auth header (optional for public pages)
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id;
    }

    const body = await req.json();
    
    // Insert activity log
    const { error: insertError } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        session_id: body.session_id,
        activity_type: body.activity_type,
        activity_name: body.activity_name,
        route_name: body.route_name,
        route_path: body.route_path,
        description: body.description,
        metadata: body.metadata,
        duration_ms: body.duration_ms,
      });

    if (insertError) {
      logger.error('Failed to insert activity log', insertError, {
        userId,
        metadata: { activity_type: body.activity_type }
      });
      throw insertError;
    }

    logger.info('Activity logged', {
      userId,
      metadata: { activity_type: body.activity_type, route_path: body.route_path }
    });

    logger.logDuration('log_activity', startTime, { userId });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logger.error('Error in log-activity function', error);
    logger.logDuration('log_activity', startTime, { status: 'error' });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
