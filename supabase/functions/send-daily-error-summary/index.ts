import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateEmailHTML } from "../_shared/email-templates.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { toError, getErrorMessage } from "../_shared/error-utils.ts";
import { edgeBrand, brandFrom } from "../_shared/brand.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));



serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-daily-error-summary', requestId);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    logger.info('Starting daily error summary generation');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get admin notification settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notifications')
      .single();

    if (!settings?.setting_value?.daily_summary?.enabled) {
      return new Response(
        JSON.stringify({ message: 'Daily summary disabled' }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminEmail = settings.setting_value.admin_email;
    
    // Get yesterday's date range
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Query yesterday's errors
    const { data: errors } = await supabase
      .from('user_error_logs')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .lte('created_at', yesterdayEnd.toISOString());

    // Query yesterday's new users
    const { data: newUsers } = await supabase
      .from('profiles')
      .select('email, created_at')
      .gte('created_at', yesterday.toISOString())
      .lte('created_at', yesterdayEnd.toISOString());

    // Calculate statistics
    const totalErrors = errors?.length || 0;
    const criticalErrors = errors?.filter(e => e.severity === 'critical').length || 0;
    const resolvedErrors = errors?.filter(e => e.is_resolved).length || 0;
    const newUserCount = newUsers?.length || 0;

    // Group errors by error message for detailed view
    const errorsByMessage: Record<string, { count: number; severity: string; route: string; errorType: string }> = {};
    errors?.forEach(err => {
      const key = err.error_message || 'Unknown error';
      if (!errorsByMessage[key]) {
        errorsByMessage[key] = {
          count: 0,
          severity: err.severity || 'medium',
          route: err.route_name !== 'unknown' ? err.route_name : (err.route_path || 'unknown'),
          errorType: err.error_type || 'unknown'
        };
      }
      errorsByMessage[key].count++;
    });

    // Create top errors list with descriptions
    const topErrors = Object.entries(errorsByMessage)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([message, data]) => 
        `[${data.severity.toUpperCase()}] ${message} (${data.count}x) - Route: ${data.route}`
      );

    // Group errors by route (with path fallback)
    const errorsByRoute: Record<string, number> = {};
    errors?.forEach(err => {
      const routeKey = err.route_name !== 'unknown' ? err.route_name : (err.route_path || 'unknown');
      errorsByRoute[routeKey] = (errorsByRoute[routeKey] || 0) + 1;
    });

    const topRoutes = Object.entries(errorsByRoute)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([route, count]) => `${route}: ${count} errors`);

    // Calculate health score (0-100)
    const healthScore = Math.max(0, 100 - (totalErrors * 5) - (criticalErrors * 20));

    // Generate email HTML
    const emailHTML = generateEmailHTML({
      title: `Daily Summary - ${yesterday.toLocaleDateString()}`,
      preheader: `${totalErrors} Errors, ${newUserCount} New Users`,
      headerColor: '#2563eb',
      headerEmoji: '📊',
      sections: [
        {
          type: 'summary',
          title: 'Executive Summary',
          content: `
            <p>Yesterday on ${edgeBrand.name}:</p>
            <p>✅ <strong>System Health:</strong> ${healthScore}/100</p>
            <p>👥 <strong>New Users:</strong> ${newUserCount} registrations</p>
            <p>⚠️ <strong>Issues Detected:</strong> ${totalErrors} errors (${resolvedErrors} resolved, ${totalErrors - resolvedErrors} pending)</p>
            ${criticalErrors > 0 ? `<p style="color: #dc2626;">🚨 <strong>Critical Errors:</strong> ${criticalErrors}</p>` : ''}
          `
        },
        ...(topErrors.length > 0 ? [{
          type: 'list' as const,
          title: 'Top Error Messages',
          content: topErrors
        }] : []),
        ...(topRoutes.length > 0 ? [{
          type: 'list' as const,
          title: 'Most Problematic Routes',
          content: topRoutes
        }] : []),
        ...(newUserCount > 0 ? [{
          type: 'summary' as const,
          title: 'New Users Summary',
          content: `<p>${newUserCount} new users registered yesterday</p>`
        }] : []),
        {
          type: 'actions',
          title: 'Quick Actions',
          content: [
            {
              label: 'View Full Admin Dashboard',
              url: `${edgeBrand.appUrl}/admin/user-logs`
            }
          ]
        }
      ],
      footer: `Sent by ${edgeBrand.name} Monitoring System`
    });

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: brandFrom('Alerts', edgeBrand.alertsEmail),
      to: [adminEmail],
      subject: `📊 Daily Summary - ${yesterday.toLocaleDateString()} | ${totalErrors} Errors, ${newUserCount} New Users`,
      html: emailHTML,
    });

    if (emailError) {
      logger.error('Failed to send daily summary email', emailError, { 
        metadata: { adminEmail, totalErrors, newUserCount } 
      });
      throw emailError;
    }

    logger.info('Daily summary email sent successfully', { 
      metadata: { adminEmail, totalErrors, newUserCount, healthScore } 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        stats: {
          totalErrors,
          criticalErrors,
          newUserCount,
          healthScore
        }
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Error in daily summary', toError(error));
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
