import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeLogger } from '../_shared/edge-logger.ts';
import { AUDIT_ACTIONS, ALERT_TYPES, ALERT_SEVERITY } from '../_shared/constants.ts';
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('security-monitor', requestId);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    // SECURITY: Authenticate admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for monitoring
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify user is authenticated and is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const alerts: Array<{ type: string; message: string; severity: string }> = [];

    // Fetch security thresholds from database (configurable)
    const { data: securityConfig } = await supabaseAdmin
      .from('security_config')
      .select('config_key, config_value');

    // Build thresholds object with defaults as fallback
    const thresholds = (securityConfig || []).reduce((acc, row) => {
      acc[row.config_key] = row.config_value;
      return acc;
    }, {} as Record<string, any>);

    // Extract values with defaults
    const failedLoginConfig = thresholds.failed_login_threshold || { window_minutes: 15, count: 5 };
    const rapidSignupConfig = thresholds.rapid_signup_threshold || { window_hours: 1, count: 3 };
    const tokenUsageConfig = thresholds.token_usage_threshold || { window_hours: 1, tokens: 1000 };

    // Check for multiple failed login attempts from same IP
    const failedLoginWindow = new Date(now.getTime() - failedLoginConfig.window_minutes * 60 * 1000);
    const { data: failedLogins } = await supabaseAdmin
      .from('audit_logs')
      .select('ip_address, count')
      .eq('action', AUDIT_ACTIONS.LOGIN_FAILED)
      .gte('created_at', failedLoginWindow.toISOString());

    if (failedLogins) {
      const ipCounts = failedLogins.reduce((acc: Record<string, number>, log: any) => {
        acc[log.ip_address] = (acc[log.ip_address] || 0) + 1;
        return acc;
      }, {});

      for (const [ip, count] of Object.entries(ipCounts)) {
        if (count >= failedLoginConfig.count) {
          alerts.push({
            type: ALERT_TYPES.MULTIPLE_FAILED_LOGINS,
            message: `${count} failed login attempts from IP ${ip} in the last ${failedLoginConfig.window_minutes} minutes`,
            severity: ALERT_SEVERITY.HIGH,
          });

          // Log the security alert
          await supabaseAdmin.from('audit_logs').insert({
            user_id: null,
            action: AUDIT_ACTIONS.SECURITY_ALERT,
            metadata: {
              alert_type: ALERT_TYPES.MULTIPLE_FAILED_LOGINS,
              ip_address: ip,
              attempt_count: count,
            },
          });
        }
      }
    }

    // Check for rapid account creation from same IP
    const rapidSignupWindow = new Date(now.getTime() - rapidSignupConfig.window_hours * 60 * 60 * 1000);
    const { data: recentSignups } = await supabaseAdmin
      .from('audit_logs')
      .select('ip_address, count')
      .eq('action', AUDIT_ACTIONS.SIGNUP_SUCCESS)
      .gte('created_at', rapidSignupWindow.toISOString());

    if (recentSignups) {
      const signupIpCounts = recentSignups.reduce((acc: Record<string, number>, log: any) => {
        acc[log.ip_address] = (acc[log.ip_address] || 0) + 1;
        return acc;
      }, {});

      for (const [ip, count] of Object.entries(signupIpCounts)) {
        if (count >= rapidSignupConfig.count) {
          alerts.push({
            type: ALERT_TYPES.RAPID_ACCOUNT_CREATION,
            message: `${count} accounts created from IP ${ip} in the last ${rapidSignupConfig.window_hours} hour(s)`,
            severity: ALERT_SEVERITY.MEDIUM,
          });

          // Log the security alert
          await supabaseAdmin.from('audit_logs').insert({
            user_id: null,
            action: AUDIT_ACTIONS.SECURITY_ALERT,
            metadata: {
              alert_type: ALERT_TYPES.RAPID_ACCOUNT_CREATION,
              ip_address: ip,
              account_count: count,
            },
          });
        }
      }
    }

    // Check for unusual token usage patterns
    const tokenUsageWindow = new Date(now.getTime() - tokenUsageConfig.window_hours * 60 * 60 * 1000);
    const { data: tokenUsage } = await supabaseAdmin
      .from('generations')
      .select('user_id, tokens_used, created_at')
      .gte('created_at', tokenUsageWindow.toISOString());

    if (tokenUsage) {
      const userTokens = tokenUsage.reduce((acc: Record<string, number>, gen: any) => {
        acc[gen.user_id] = (acc[gen.user_id] || 0) + gen.tokens_used;
        return acc;
      }, {});

      for (const [userId, tokens] of Object.entries(userTokens)) {
        if (tokens > tokenUsageConfig.tokens) {
          alerts.push({
            type: ALERT_TYPES.UNUSUAL_TOKEN_USAGE,
            message: `User ${userId} used ${tokens} tokens in the last ${tokenUsageConfig.window_hours} hour(s)`,
            severity: ALERT_SEVERITY.MEDIUM,
          });

          // Log the security alert
          await supabaseAdmin.from('audit_logs').insert({
            user_id: userId,
            action: AUDIT_ACTIONS.SECURITY_ALERT,
            metadata: {
              alert_type: ALERT_TYPES.UNUSUAL_TOKEN_USAGE,
              tokens_used: tokens,
              time_window: `${tokenUsageConfig.window_hours} hour(s)`,
            },
          });
        }
      }
    }

    logger.info('Security scan complete', { 
      metadata: { alertCount: alerts.length, userId: user.id } 
    });

    return new Response(
      JSON.stringify({
        success: true,
        alerts_count: alerts.length,
        alerts,
        timestamp: now.toISOString(),
      }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in security-monitor function', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
