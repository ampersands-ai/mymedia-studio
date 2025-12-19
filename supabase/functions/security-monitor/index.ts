import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeLogger } from '../_shared/edge-logger.ts';
import { AUDIT_ACTIONS, ALERT_TYPES, ALERT_SEVERITY } from '../_shared/constants.ts';
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

// Extended config interface for new detection types
interface SecurityConfigValue {
  window_minutes?: number;
  window_hours?: number;
  count?: number;
  tokens?: number;
  password_resets?: number;
  profile_lookups?: number;
  downloads?: number;
}

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
    const alerts: Array<{ type: string; message: string; severity: string; metadata?: Record<string, unknown> }> = [];

    // Fetch security thresholds from database (configurable)
    const { data: securityConfig } = await supabaseAdmin
      .from('security_config')
      .select('config_key, config_value');

    // Build thresholds object with defaults as fallback
    const thresholds = (securityConfig || []).reduce((acc, row) => {
      acc[row.config_key] = row.config_value as SecurityConfigValue;
      return acc;
    }, {} as Record<string, SecurityConfigValue>);

    // Extract values with defaults - existing detection
    const failedLoginConfig = { window_minutes: 15, count: 5, ...thresholds.failed_login_threshold };
    const rapidSignupConfig = { window_hours: 1, count: 3, ...thresholds.rapid_signup_threshold };
    const tokenUsageConfig = { window_hours: 1, tokens: 1000, ...thresholds.token_usage_threshold };
    
    // NEW: Enhanced detection thresholds
    const profileEnumConfig = { window_minutes: 5, profile_lookups: 20, ...thresholds.profile_enum_threshold };
    const bulkDownloadConfig = { window_minutes: 10, downloads: 50, ...thresholds.bulk_download_threshold };
    const accountTakeoverConfig = { window_hours: 24, password_resets: 3, ...thresholds.account_takeover_threshold };
    const adminAccessConfig = { window_minutes: 10, count: 20, ...thresholds.admin_access_threshold };

    // Check for multiple failed login attempts from same IP
    const failedLoginWindow = new Date(now.getTime() - failedLoginConfig.window_minutes * 60 * 1000);
    const { data: failedLogins } = await supabaseAdmin
      .from('audit_logs')
      .select('ip_address, count')
      .eq('action', AUDIT_ACTIONS.LOGIN_FAILED)
      .gte('created_at', failedLoginWindow.toISOString());

    interface AuditLog {
      ip_address: string;
      count?: number;
    }

    if (failedLogins) {
      const ipCounts = failedLogins.reduce((acc: Record<string, number>, log: AuditLog) => {
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
      const signupIpCounts = recentSignups.reduce((acc: Record<string, number>, log: AuditLog) => {
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

    interface GenerationRecord {
      user_id: string;
      tokens_used: number;
      created_at: string;
    }

    if (tokenUsage) {
      const userTokens = tokenUsage.reduce((acc: Record<string, number>, gen: GenerationRecord) => {
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

    // ============================================
    // NEW: Enhanced Anomaly Detection Algorithms
    // ============================================

    // 1. Profile Enumeration Detection
    // Detect when same IP makes rapid profile lookups (potential scraping)
    const profileEnumWindow = new Date(now.getTime() - profileEnumConfig.window_minutes * 60 * 1000);
    const { data: profileLookups } = await supabaseAdmin
      .from('audit_logs')
      .select('ip_address, user_id, resource_id')
      .in('action', [AUDIT_ACTIONS.ADMIN_VIEW_PROFILE, 'profile_view'])
      .gte('created_at', profileEnumWindow.toISOString());

    if (profileLookups) {
      const ipProfileCounts = profileLookups.reduce((acc: Record<string, Set<string>>, log) => {
        const ip = log.ip_address || 'unknown';
        if (!acc[ip]) acc[ip] = new Set();
        if (log.resource_id) acc[ip].add(log.resource_id);
        return acc;
      }, {});

      for (const [ip, profileIds] of Object.entries(ipProfileCounts)) {
        if (profileIds.size >= profileEnumConfig.profile_lookups) {
          alerts.push({
            type: ALERT_TYPES.PROFILE_ENUMERATION,
            message: `IP ${ip} accessed ${profileIds.size} unique profiles in ${profileEnumConfig.window_minutes} minutes`,
            severity: ALERT_SEVERITY.HIGH,
            metadata: { ip_address: ip, profile_count: profileIds.size }
          });

          await supabaseAdmin.from('audit_logs').insert({
            user_id: null,
            action: AUDIT_ACTIONS.SECURITY_ALERT,
            ip_address: ip,
            metadata: {
              alert_type: ALERT_TYPES.PROFILE_ENUMERATION,
              profile_count: profileIds.size,
              window_minutes: profileEnumConfig.window_minutes,
            },
          });
        }
      }
    }

    // 2. Bulk Download Detection
    // Monitor for excessive data exports/downloads
    const bulkDownloadWindow = new Date(now.getTime() - bulkDownloadConfig.window_minutes * 60 * 1000);
    const { data: downloads } = await supabaseAdmin
      .from('audit_logs')
      .select('user_id, ip_address')
      .in('action', ['download', 'export', 'bulk_export'])
      .gte('created_at', bulkDownloadWindow.toISOString());

    if (downloads) {
      const userDownloadCounts = downloads.reduce((acc: Record<string, number>, log) => {
        const key = log.user_id || log.ip_address || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      for (const [identifier, count] of Object.entries(userDownloadCounts)) {
        if (count >= bulkDownloadConfig.downloads) {
          alerts.push({
            type: ALERT_TYPES.BULK_DOWNLOAD_ATTEMPT,
            message: `${count} downloads from ${identifier} in ${bulkDownloadConfig.window_minutes} minutes`,
            severity: ALERT_SEVERITY.HIGH,
            metadata: { identifier, download_count: count }
          });

          await supabaseAdmin.from('audit_logs').insert({
            user_id: identifier.includes('-') ? identifier : null,
            action: AUDIT_ACTIONS.SECURITY_ALERT,
            metadata: {
              alert_type: ALERT_TYPES.BULK_DOWNLOAD_ATTEMPT,
              download_count: count,
              window_minutes: bulkDownloadConfig.window_minutes,
            },
          });
        }
      }
    }

    // 3. Account Takeover Detection
    // Detect password reset attempts followed by login from new IP
    const accountTakeoverWindow = new Date(now.getTime() - accountTakeoverConfig.window_hours * 60 * 60 * 1000);
    const { data: passwordResets } = await supabaseAdmin
      .from('audit_logs')
      .select('user_id, ip_address, metadata')
      .eq('action', AUDIT_ACTIONS.PASSWORD_CHANGED)
      .gte('created_at', accountTakeoverWindow.toISOString());

    if (passwordResets) {
      const userResetCounts = passwordResets.reduce((acc: Record<string, { count: number; ips: Set<string> }>, log) => {
        const userId = log.user_id;
        if (!userId) return acc;
        if (!acc[userId]) acc[userId] = { count: 0, ips: new Set() };
        acc[userId].count++;
        if (log.ip_address) acc[userId].ips.add(log.ip_address);
        return acc;
      }, {});

      for (const [userId, data] of Object.entries(userResetCounts)) {
        if (data.count >= accountTakeoverConfig.password_resets) {
          alerts.push({
            type: ALERT_TYPES.ACCOUNT_TAKEOVER_ATTEMPT,
            message: `User ${userId} had ${data.count} password resets from ${data.ips.size} IPs in ${accountTakeoverConfig.window_hours} hours`,
            severity: ALERT_SEVERITY.CRITICAL,
            metadata: { user_id: userId, reset_count: data.count, unique_ips: data.ips.size }
          });

          await supabaseAdmin.from('audit_logs').insert({
            user_id: userId,
            action: AUDIT_ACTIONS.SECURITY_ALERT,
            metadata: {
              alert_type: ALERT_TYPES.ACCOUNT_TAKEOVER_ATTEMPT,
              reset_count: data.count,
              unique_ips: data.ips.size,
              window_hours: accountTakeoverConfig.window_hours,
            },
          });
        }
      }
    }

    // 4. Suspicious Admin Access Detection
    // Flag when admins access many user profiles rapidly
    const adminAccessWindow = new Date(now.getTime() - adminAccessConfig.window_minutes * 60 * 1000);
    const { data: adminAccess } = await supabaseAdmin
      .from('audit_logs')
      .select('user_id, resource_id')
      .in('action', [AUDIT_ACTIONS.ADMIN_VIEW_PROFILE, AUDIT_ACTIONS.ADMIN_VIEW_GENERATION])
      .gte('created_at', adminAccessWindow.toISOString());

    if (adminAccess) {
      const adminAccessCounts = adminAccess.reduce((acc: Record<string, Set<string>>, log) => {
        const adminId = log.user_id;
        if (!adminId) return acc;
        if (!acc[adminId]) acc[adminId] = new Set();
        if (log.resource_id) acc[adminId].add(log.resource_id);
        return acc;
      }, {});

      for (const [adminId, resourceIds] of Object.entries(adminAccessCounts)) {
        if (resourceIds.size >= adminAccessConfig.count) {
          alerts.push({
            type: ALERT_TYPES.SUSPICIOUS_ADMIN_ACCESS,
            message: `Admin ${adminId} accessed ${resourceIds.size} user resources in ${adminAccessConfig.window_minutes} minutes`,
            severity: ALERT_SEVERITY.MEDIUM,
            metadata: { admin_id: adminId, resource_count: resourceIds.size }
          });

          await supabaseAdmin.from('audit_logs').insert({
            user_id: adminId,
            action: AUDIT_ACTIONS.SECURITY_ALERT,
            metadata: {
              alert_type: ALERT_TYPES.SUSPICIOUS_ADMIN_ACCESS,
              resource_count: resourceIds.size,
              window_minutes: adminAccessConfig.window_minutes,
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
        scans_performed: [
          'failed_logins',
          'rapid_signups', 
          'token_usage',
          'profile_enumeration',
          'bulk_downloads',
          'account_takeover',
          'admin_access'
        ]
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
