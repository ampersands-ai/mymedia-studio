import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Thresholds for suspicious activity
const THRESHOLDS = {
  FAILED_LOGINS_WINDOW: 15 * 60 * 1000, // 15 minutes
  FAILED_LOGINS_COUNT: 5,
  RAPID_SIGNUPS_WINDOW: 60 * 60 * 1000, // 1 hour
  RAPID_SIGNUPS_COUNT: 3,
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Authenticate admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const alerts: Array<{ type: string; message: string; severity: string }> = [];

    // Check for multiple failed login attempts from same IP
    const failedLoginWindow = new Date(now.getTime() - THRESHOLDS.FAILED_LOGINS_WINDOW);
    const { data: failedLogins } = await supabaseAdmin
      .from('audit_logs')
      .select('ip_address, count')
      .eq('action', 'login_failed')
      .gte('created_at', failedLoginWindow.toISOString());

    if (failedLogins) {
      const ipCounts = failedLogins.reduce((acc: Record<string, number>, log: any) => {
        acc[log.ip_address] = (acc[log.ip_address] || 0) + 1;
        return acc;
      }, {});

      for (const [ip, count] of Object.entries(ipCounts)) {
        if (count >= THRESHOLDS.FAILED_LOGINS_COUNT) {
          alerts.push({
            type: 'MULTIPLE_FAILED_LOGINS',
            message: `${count} failed login attempts from IP ${ip} in the last 15 minutes`,
            severity: 'high',
          });

          // Log the security alert
          await supabaseAdmin.from('audit_logs').insert({
            user_id: null,
            action: 'security_alert',
            metadata: {
              alert_type: 'MULTIPLE_FAILED_LOGINS',
              ip_address: ip,
              attempt_count: count,
            },
          });
        }
      }
    }

    // Check for rapid account creation from same IP
    const rapidSignupWindow = new Date(now.getTime() - THRESHOLDS.RAPID_SIGNUPS_WINDOW);
    const { data: recentSignups } = await supabaseAdmin
      .from('audit_logs')
      .select('ip_address, count')
      .eq('action', 'signup_success')
      .gte('created_at', rapidSignupWindow.toISOString());

    if (recentSignups) {
      const signupIpCounts = recentSignups.reduce((acc: Record<string, number>, log: any) => {
        acc[log.ip_address] = (acc[log.ip_address] || 0) + 1;
        return acc;
      }, {});

      for (const [ip, count] of Object.entries(signupIpCounts)) {
        if (count >= THRESHOLDS.RAPID_SIGNUPS_COUNT) {
          alerts.push({
            type: 'RAPID_ACCOUNT_CREATION',
            message: `${count} accounts created from IP ${ip} in the last hour`,
            severity: 'medium',
          });

          // Log the security alert
          await supabaseAdmin.from('audit_logs').insert({
            user_id: null,
            action: 'security_alert',
            metadata: {
              alert_type: 'RAPID_ACCOUNT_CREATION',
              ip_address: ip,
              account_count: count,
            },
          });
        }
      }
    }

    // Check for unusual token usage patterns
    const { data: tokenUsage } = await supabaseAdmin
      .from('generations')
      .select('user_id, tokens_used, created_at')
      .gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString());

    if (tokenUsage) {
      const userTokens = tokenUsage.reduce((acc: Record<string, number>, gen: any) => {
        acc[gen.user_id] = (acc[gen.user_id] || 0) + gen.tokens_used;
        return acc;
      }, {});

      for (const [userId, tokens] of Object.entries(userTokens)) {
        if (tokens > 1000) {
          alerts.push({
            type: 'UNUSUAL_TOKEN_USAGE',
            message: `User ${userId} used ${tokens} tokens in the last hour`,
            severity: 'medium',
          });

          // Log the security alert
          await supabaseAdmin.from('audit_logs').insert({
            user_id: userId,
            action: 'security_alert',
            metadata: {
              alert_type: 'UNUSUAL_TOKEN_USAGE',
              tokens_used: tokens,
              time_window: '1 hour',
            },
          });
        }
      }
    }

    console.log(`Security monitoring completed. Found ${alerts.length} alerts.`);

    return new Response(
      JSON.stringify({
        success: true,
        alerts_count: alerts.length,
        alerts,
        timestamp: now.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in security-monitor function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
