import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateEmailHTML } from "../_shared/email-templates.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-daily-error-summary', requestId);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const highErrors = errors?.filter(e => e.severity === 'high').length || 0;
    const resolvedErrors = errors?.filter(e => e.is_resolved).length || 0;
    const newUserCount = newUsers?.length || 0;

    // Group errors by route
    const errorsByRoute: Record<string, number> = {};
    errors?.forEach(err => {
      errorsByRoute[err.route_name] = (errorsByRoute[err.route_name] || 0) + 1;
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
            <p>Yesterday on Artifio.ai:</p>
            <p>✅ <strong>System Health:</strong> ${healthScore}/100</p>
            <p>👥 <strong>New Users:</strong> ${newUserCount} registrations</p>
            <p>⚠️ <strong>Issues Detected:</strong> ${totalErrors} errors (${resolvedErrors} resolved, ${totalErrors - resolvedErrors} pending)</p>
            ${criticalErrors > 0 ? `<p style="color: #dc2626;">🚨 <strong>Critical Errors:</strong> ${criticalErrors}</p>` : ''}
          `
        },
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
              url: 'https://artifio.ai/admin/user-logs'
            }
          ]
        }
      ],
      footer: 'Sent by Artifio Monitoring System'
    });

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: 'Artifio Alerts <alerts@artifio.ai>',
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logger.error('Error in daily summary', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
