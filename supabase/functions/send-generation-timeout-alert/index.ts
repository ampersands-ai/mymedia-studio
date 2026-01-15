import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateEmailHTML } from "../_shared/email-templates.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { getErrorMessage } from "../_shared/error-utils.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));



serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-generation-timeout-alert', requestId);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { generation_id, elapsed_minutes, model_name, provider, user_email, prompt } = body;

    // Get admin email from settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notifications')
      .single();

    if (!settings?.setting_value?.error_alerts?.enabled) {
      return new Response(
        JSON.stringify({ message: 'Alerts disabled' }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminEmail = settings.setting_value.admin_email;

    // Generate email HTML
    const emailHTML = generateEmailHTML({
      title: `Generation Timeout Warning`,
      preheader: `Generation ${generation_id} has been running for ${elapsed_minutes} minutes`,
      headerColor: '#ea580c',
      headerEmoji: '⏱️',
      sections: [
        {
          type: 'summary',
          title: 'Timeout Alert',
          content: `
            <p><strong>What happened?</strong><br/>A generation has been running for over 5 minutes without completion.</p>
            <p><strong>Generation ID:</strong><br/>${generation_id}</p>
            <p><strong>Elapsed Time:</strong><br/>${elapsed_minutes} minutes</p>
            <p><strong>Provider:</strong><br/>${provider || 'Unknown'}</p>
            <p><strong>Model:</strong><br/>${model_name || 'Unknown'}</p>
            ${user_email ? `<p><strong>User:</strong><br/>${user_email}</p>` : ''}
            ${prompt ? `<p><strong>Prompt:</strong><br/>${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}</p>` : ''}
          `
        },
        {
          type: 'details',
          title: 'Possible Issues',
          content: `• Provider API may be experiencing delays
• Generation may be stuck in processing
• Webhook callback may have failed
• Model may be overloaded

Recommended Actions:
1. Check webhook logs for this generation
2. Verify provider API status
3. Consider canceling and retrying if >10 minutes
4. Check similar timeouts in last hour`
        },
        {
          type: 'actions',
          title: 'Quick Actions',
          content: [
            {
              label: 'View Generation Details',
              url: `https://artifio.ai/admin/webhook-monitor`
            },
            {
              label: 'View All Stuck Generations',
              url: `https://artifio.ai/admin/webhook-monitor`
            }
          ]
        }
      ],
      footer: 'Sent by Artifio Generation Monitor'
    });

    // Send email
    const emailResponse = await resend.emails.send({
      from: 'Artifio Alerts <alerts@artifio.ai>',
      to: [adminEmail],
      subject: `⏱️ Generation Timeout: ${elapsed_minutes} minutes - ${generation_id.substring(0, 8)}`,
      html: emailHTML,
    });

    // Enhanced logging for debugging delivery issues
    logger.info('Resend API response', {
      metadata: { 
        success: !emailResponse.error,
        emailId: emailResponse.data?.id,
        errorName: emailResponse.error?.name,
        errorMessage: emailResponse.error?.message,
        adminEmail,
        generation_id
      }
    });

    if (emailResponse.error) {
      logger.error('Failed to send timeout alert email', emailResponse.error, {
        metadata: { 
          generation_id, 
          elapsed_minutes, 
          provider, 
          model_name,
          errorName: emailResponse.error.name,
          errorMessage: emailResponse.error.message
        }
      });
      throw emailResponse.error;
    }
    
    logger.info('Timeout alert email sent successfully', {
      metadata: { 
        generation_id, 
        elapsed_minutes, 
        provider, 
        model_name, 
        adminEmail,
        emailId: emailResponse.data?.id
      }
    });

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: body.user_id || null,
      action: 'generation_timeout_alert',
      metadata: {
        generation_id,
        elapsed_minutes,
        provider,
        model_name,
        alert_sent: true,
      }
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Error in send-generation-timeout-alert function', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
