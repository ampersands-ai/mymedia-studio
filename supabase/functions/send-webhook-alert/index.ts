import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateSlackPayload, generateDiscordPayload } from "./_slack-discord.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertPayload {
  type: 'failure_rate' | 'storage_spike' | 'test' | 'model_failure';
  severity?: 'warning' | 'critical';
  message: string;
  failureRate?: number;
  storageFailures?: number;
  threshold?: number;
  details?: any;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get alert settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'webhook_alerts')
      .maybeSingle();

    if (settingsError) throw settingsError;

    const settings = settingsData?.setting_value as any;

    if (!settings?.enabled && req.method !== 'POST') {
      return new Response(
        JSON.stringify({ message: 'Alerts are disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For test alerts or triggered alerts
    if (req.method === 'POST') {
      const payload: AlertPayload = await req.json();

      // Check if at least one notification channel is enabled
      const hasEmailChannel = settings?.enable_email && settings?.admin_emails?.length > 0;
      const hasSlackChannel = settings?.enable_slack && settings?.slack_webhook_url;
      const hasDiscordChannel = settings?.enable_discord && settings?.discord_webhook_url;

      if (!hasEmailChannel && !hasSlackChannel && !hasDiscordChannel) {
        return new Response(
          JSON.stringify({ error: 'No notification channels configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check cooldown (except for test alerts)
      if (payload.type !== 'test') {
        const cooldownMinutes = settings.cooldown_minutes || 30;
        const { data: recentAlert } = await supabase
          .from('audit_logs')
          .select('created_at')
          .eq('action', `webhook_alert_${payload.type}`)
          .gte('created_at', new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentAlert) {
          console.log('Alert suppressed due to cooldown');
          return new Response(
            JSON.stringify({ message: 'Alert suppressed (cooldown period)' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Generate email content
      const subject = payload.type === 'test' 
        ? '🔔 Test Alert - Webhook Monitoring System'
        : payload.type === 'failure_rate'
        ? '🚨 ALERT: High Webhook Failure Rate Detected'
        : '⚠️ ALERT: Storage Failure Spike Detected';

      const results = {
        email: { sent: 0, failed: 0 },
        slack: { sent: 0, failed: 0 },
        discord: { sent: 0, failed: 0 },
      };

      // Send email alerts
      if (hasEmailChannel) {
        const htmlContent = generateEmailHTML(payload, settings);
        const emailPromises = settings.admin_emails.map((email: string) =>
          resend.emails.send({
            from: 'Webhook Monitor <alerts@resend.dev>',
            to: [email],
            subject,
            html: htmlContent,
          })
        );

        const emailResults = await Promise.allSettled(emailPromises);
        results.email.sent = emailResults.filter(r => r.status === 'fulfilled').length;
        results.email.failed = emailResults.filter(r => r.status === 'rejected').length;
        console.log(`📧 Email: ${results.email.sent} sent, ${results.email.failed} failed`);
      }

      // Send Slack alert
      if (hasSlackChannel) {
        try {
          const slackPayload = generateSlackPayload(payload, settings);
          const slackResponse = await fetch(settings.slack_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slackPayload),
          });

          if (slackResponse.ok) {
            results.slack.sent = 1;
            console.log('💬 Slack: Alert sent successfully');
          } else {
            results.slack.failed = 1;
            console.error('Slack alert failed:', await slackResponse.text());
          }
        } catch (error) {
          results.slack.failed = 1;
          console.error('Slack alert error:', error);
        }
      }

      // Send Discord alert
      if (hasDiscordChannel) {
        try {
          const discordPayload = generateDiscordPayload(payload, settings);
          const discordResponse = await fetch(settings.discord_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordPayload),
          });

          if (discordResponse.ok || discordResponse.status === 204) {
            results.discord.sent = 1;
            console.log('💬 Discord: Alert sent successfully');
          } else {
            results.discord.failed = 1;
            console.error('Discord alert failed:', await discordResponse.text());
          }
        } catch (error) {
          results.discord.failed = 1;
          console.error('Discord alert error:', error);
        }
      }

      // Log the alert to audit logs
      if (payload.type !== 'test') {
        await supabase
          .from('audit_logs')
          .insert({
            action: `webhook_alert_${payload.type}`,
            metadata: {
              alert_type: payload.type,
              channels: {
                email: hasEmailChannel ? settings.admin_emails : [],
                slack: hasSlackChannel,
                discord: hasDiscordChannel,
              },
              results,
              ...payload,
            },
          });
      }

      const totalSent = results.email.sent + results.slack.sent + results.discord.sent;
      const totalFailed = results.email.failed + results.slack.failed + results.discord.failed;

      // Determine severity
      let severity = 'info';
      if (payload.type === 'failure_rate' && (payload.failureRate || 0) > 50) {
        severity = 'critical';
      } else if (payload.type === 'storage_spike' && (payload.storageFailures || 0) > settings.storage_failure_threshold * 2) {
        severity = 'critical';
      } else if (payload.type !== 'test') {
        severity = 'warning';
      }

      // Determine channels sent and failed
      const channelsSent = [];
      const channelsFailed = [];
      
      if (results.email.sent > 0) channelsSent.push('email');
      if (results.email.failed > 0) channelsFailed.push('email');
      if (results.slack.sent > 0) channelsSent.push('slack');
      if (results.slack.failed > 0) channelsFailed.push('slack');
      if (results.discord.sent > 0) channelsSent.push('discord');
      if (results.discord.failed > 0) channelsFailed.push('discord');

      // Log to alert history
      await supabase
        .from('webhook_alert_history')
        .insert({
          alert_type: payload.type,
          severity,
          trigger_value: payload.type === 'failure_rate' ? (payload.failureRate || 0) : (payload.storageFailures || 0),
          threshold_value: payload.threshold || 0,
          message: payload.message,
          channels_sent: channelsSent,
          channels_failed: channelsFailed,
          recipients: hasEmailChannel ? settings.admin_emails : [],
          metadata: {
            test_alert: payload.type === 'test',
            slack_webhook_configured: hasSlackChannel,
            discord_webhook_configured: hasDiscordChannel,
            total_sent: totalSent,
            total_failed: totalFailed,
          }
        });

      return new Response(
        JSON.stringify({ 
          success: true,
          total_sent: totalSent,
          total_failed: totalFailed,
          breakdown: results,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-webhook-alert:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateEmailHTML(payload: AlertPayload, settings: any): string {
  if (payload.type === 'test') {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔔 Test Alert</h1>
            </div>
            <div style="padding: 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6;">
                This is a test alert from your Webhook Monitoring System.
              </p>
              <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                If you're receiving this email, your alert system is configured correctly and ready to notify you of any webhook issues.
              </p>
              <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #333333; font-size: 16px;">Current Settings:</h3>
                <ul style="color: #666666; font-size: 14px; line-height: 1.8;">
                  <li>Failure Rate Threshold: <strong>${settings.failure_rate_threshold}%</strong></li>
                  <li>Storage Failure Threshold: <strong>${settings.storage_failure_threshold} failures</strong></li>
                  <li>Check Interval: <strong>${settings.check_interval_minutes} minutes</strong></li>
                  <li>Alert Cooldown: <strong>${settings.cooldown_minutes} minutes</strong></li>
                </ul>
              </div>
            </div>
            <div style="padding: 20px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                Webhook Monitoring System • ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  const isFailureRate = payload.type === 'failure_rate';
  const alertColor = isFailureRate ? '#dc3545' : '#fd7e14';
  const icon = isFailureRate ? '🚨' : '⚠️';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background-color: ${alertColor}; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${icon} Webhook Alert</h1>
          </div>
          <div style="padding: 30px;">
            <div style="background-color: #fff3cd; border-left: 4px solid ${alertColor}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
              <p style="color: #856404; margin: 0; font-weight: 600; font-size: 16px;">
                ${payload.message}
              </p>
            </div>
            
            <h3 style="color: #333333; font-size: 18px; margin-top: 0;">Alert Details:</h3>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                ${isFailureRate ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Current Failure Rate:</td>
                    <td style="padding: 8px 0; color: #333333; font-weight: 600; text-align: right; font-size: 14px;">${payload.failureRate}%</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Threshold:</td>
                    <td style="padding: 8px 0; color: #333333; font-weight: 600; text-align: right; font-size: 14px;">${payload.threshold}%</td>
                  </tr>
                ` : `
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Storage Failures:</td>
                    <td style="padding: 8px 0; color: #333333; font-weight: 600; text-align: right; font-size: 14px;">${payload.storageFailures}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Threshold:</td>
                    <td style="padding: 8px 0; color: #333333; font-weight: 600; text-align: right; font-size: 14px;">${payload.threshold}</td>
                  </tr>
                `}
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Detected At:</td>
                  <td style="padding: 8px 0; color: #333333; font-weight: 600; text-align: right; font-size: 14px;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <h3 style="color: #333333; font-size: 16px;">Recommended Actions:</h3>
            <ul style="color: #666666; font-size: 14px; line-height: 1.8;">
              <li>Check the webhook monitoring dashboard for detailed information</li>
              <li>Review recent error logs and provider responses</li>
              <li>Verify storage bucket permissions and configuration</li>
              <li>Monitor provider API status pages</li>
              <li>Check rate limiting settings if issues persist</li>
            </ul>

            <div style="margin-top: 30px; text-align: center;">
              <a href="${supabaseUrl.replace('https://', 'https://app.')}/admin/webhook-monitor" 
                 style="display: inline-block; background-color: ${alertColor}; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                View Dashboard
              </a>
            </div>
          </div>
          <div style="padding: 20px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              Webhook Monitoring System • Next alert after ${settings.cooldown_minutes} minute cooldown
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
