import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertPayload {
  type: 'failure_rate' | 'storage_spike' | 'test';
  message: string;
  failureRate?: number;
  storageFailures?: number;
  threshold?: number;
  details?: any;
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

      if (!settings?.admin_emails || settings.admin_emails.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No admin emails configured' }),
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

      const htmlContent = generateEmailHTML(payload, settings);

      // Send emails
      const emailPromises = settings.admin_emails.map((email: string) =>
        resend.emails.send({
          from: 'Webhook Monitor <alerts@resend.dev>',
          to: [email],
          subject,
          html: htmlContent,
        })
      );

      const results = await Promise.allSettled(emailPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;

      console.log(`Sent ${successCount} alerts, ${failedCount} failed`);

      // Log the alert
      if (payload.type !== 'test') {
        await supabase
          .from('audit_logs')
          .insert({
            action: `webhook_alert_${payload.type}`,
            metadata: {
              alert_type: payload.type,
              recipients: settings.admin_emails,
              success_count: successCount,
              failed_count: failedCount,
              ...payload,
            },
          });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: successCount,
          failed: failedCount,
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
