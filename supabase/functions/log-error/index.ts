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

  const logger = new EdgeLogger('log-error', requestId);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '')
    );

    const body = await req.json();
    
    // Insert error log
    const { data: errorRecord, error: insertError } = await supabase
      .from('user_error_logs')
      .insert({
        user_id: user?.id || null,
        session_id: body.session_id,
        error_type: body.error_type,
        severity: body.severity || 'medium',
        category: body.category,
        route_name: body.route_name,
        route_path: body.route_path,
        component_name: body.component_name,
        error_message: body.error_message,
        error_stack: body.error_stack,
        component_stack: body.component_stack,
        user_action: body.user_action,
        browser_info: body.browser_info,
        viewport: body.viewport,
        metadata: body.metadata,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to insert error log', insertError instanceof Error ? insertError : new Error(insertError?.message || 'Database error'), {
        userId: user?.id,
        metadata: { error_type: body.error_type, severity: body.severity }
      });
      throw insertError;
    }

    logger.warn('Frontend error logged', {
      userId: user?.id,
      metadata: { 
        error_id: errorRecord.id,
        error_type: body.error_type,
        severity: body.severity,
        route: body.route_path
      }
    });

    // Check if should send email alert
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notifications')
      .single();

    if (settings?.setting_value?.error_alerts?.enabled) {
      const alertConfig = settings.setting_value.error_alerts;
      const minSeverity = alertConfig.min_severity || 'high';
      const severityRank: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
      
      if (severityRank[body.severity] >= severityRank[minSeverity]) {
        // Extract affected scripts from stack traces
        const affectedScripts = extractAffectedScripts(body.error_stack, body.component_stack);
        
        // Trigger email alert (fire and forget)
        supabase.functions.invoke('send-error-alert', {
          body: {
            error_id: errorRecord.id,
            user_email: user?.email,
            affected_scripts: affectedScripts,
            ...body,
          }
        }).catch(err => logger.error('Failed to send error alert', err));
      }
    }

    logger.logDuration('log_error', startTime, { userId: user?.id });

    return new Response(
      JSON.stringify({ success: true, error_id: errorRecord.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logger.critical('Error in log-error function', error);
    logger.logDuration('log_error', startTime, { status: 'error' });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractAffectedScripts(errorStack?: string, componentStack?: string): string[] {
  const files = new Set<string>();
  
  if (errorStack) {
    const stackMatches = errorStack.match(/at .+ \((.+?):\d+:\d+\)/g) || [];
    stackMatches.forEach(match => {
      const file = match.match(/\((.+?):\d+:\d+\)/)?.[1];
      if (file && file.startsWith('src/')) files.add(file);
    });
  }
  
  if (componentStack) {
    const componentMatches = componentStack.match(/at (\w+) \((.+?)\)/g) || [];
    componentMatches.forEach(match => {
      const file = match.match(/\((.+?)\)/)?.[1];
      if (file && file.startsWith('src/')) files.add(file);
    });
  }
  
  return Array.from(files);
}
