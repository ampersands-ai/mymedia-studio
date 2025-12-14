import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  const logger = new EdgeLogger('log-activity', requestId);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
      logger.error('Failed to insert activity log', insertError instanceof Error ? insertError : new Error(String(insertError) || 'Database error'), {
        userId: userId || undefined,
        metadata: { activity_type: body.activity_type }
      });
      throw insertError;
    }

    logger.info('Activity logged', {
      userId: userId || undefined,
      metadata: { activity_type: body.activity_type, route_path: body.route_path }
    });

    logger.logDuration('log_activity', startTime, { userId: userId || undefined, requestId });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error in log-activity function', err, { requestId });
    
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }
});
