import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateEmailHTML } from "../_shared/email-templates.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-error-alert', requestId);
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    
    logger.info('Processing error alert', { 
      metadata: { 
        errorId: body.error_id, 
        severity: body.severity,
        route: body.route_name 
      }
    });

    // Get admin notification settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notifications')
      .single();

    if (!settings?.setting_value?.error_alerts?.enabled) {
      logger.info('Error alerts are disabled');
      return new Response(
        JSON.stringify({ message: 'Error alerts disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminEmail = settings.setting_value.admin_email;
    const cooldownMinutes = settings.setting_value.error_alerts.cooldown_minutes || 30;

    // Check cooldown period
    const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000);
    const { data: recentAlerts } = await supabase
      .from('user_error_logs')
      .select('id')
      .eq('alert_sent', true)
      .gte('created_at', cooldownTime.toISOString())
      .limit(1);

    if (recentAlerts && recentAlerts.length > 0) {
      logger.info('Cooldown period active, skipping alert', { 
        metadata: { cooldownMinutes }
      });
      return new Response(
        JSON.stringify({ message: 'Cooldown active' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get severity emoji
    const severityEmoji: Record<string, string> = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️',
    };

    const emoji = severityEmoji[body.severity] || '⚠️';
    
    logger.info('Generating email content', { 
      metadata: { severity: body.severity, emoji }
    });

    // Generate email HTML
    const emailHTML = generateEmailHTML({
      title: `[${body.severity.toUpperCase()}] Error on ${body.route_name}`,
      preheader: body.error_message,
      headerColor: body.severity === 'critical' ? '#dc2626' : '#ea580c',
      headerEmoji: emoji,
      sections: [
        {
          type: 'summary',
          title: 'Non-Technical Summary',
          content: `
            <p><strong>What happened?</strong><br/>${body.error_message}</p>
            <p><strong>Where?</strong><br/>${body.route_name}</p>
            ${body.user_email ? `<p><strong>Who was affected?</strong><br/>${body.user_email}</p>` : ''}
            <p><strong>When?</strong><br/>Just now</p>
            <p><strong>Impact:</strong> <span class="severity-${body.severity}">${body.severity.toUpperCase()}</span></p>
          `
        },
        {
          type: 'details',
          title: 'Technical Details',
          content: `Error Type: ${body.error_type}
Severity: ${body.severity}
Route: ${body.route_name}
Component: ${body.component_name || 'Unknown'}
User Action: ${body.user_action || 'Unknown'}

${body.error_stack ? `Stack Trace:\n${body.error_stack}` : 'No stack trace available'}`
        },
        ...(body.affected_scripts && body.affected_scripts.length > 0 ? [{
          type: 'list' as const,
          title: 'Files Affected',
          content: body.affected_scripts
        }] : []),
        {
          type: 'actions',
          title: 'Quick Actions',
          content: [
            {
              label: 'View in Admin Dashboard',
              url: `https://artifio.ai/admin/user-logs`
            }
          ]
        }
      ],
      footer: 'Sent by Artifio Monitoring System'
    });

    logger.info('Sending email alert', { 
      metadata: { adminEmail }
    });

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: 'Artifio Alerts <alerts@artifio.ai>',
      to: [adminEmail],
      subject: `${emoji} [${body.severity.toUpperCase()}] Error on ${body.route_name}`,
      html: emailHTML,
    });

    if (emailError) {
      logger.error('Failed to send email', emailError);
      throw emailError;
    }

    logger.info('Email sent successfully');

    // Mark alert as sent
    await supabase
      .from('user_error_logs')
      .update({ alert_sent: true })
      .eq('id', body.error_id);

    logger.logDuration('Alert sent', startTime);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logger.error('Fatal error in send-error-alert', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
