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
    const { 
      generation_id, 
      user_id,
      elapsed_minutes, 
      model_name, 
      provider, 
      user_email, 
      prompt,
      content_type,
      tokens_used,
      settings,
      created_at
    } = body;

    // Get admin email from settings
    const { data: adminSettings } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notifications')
      .single();

    if (!adminSettings?.setting_value?.error_alerts?.enabled) {
      return new Response(
        JSON.stringify({ message: 'Alerts disabled' }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminEmail = adminSettings.setting_value.admin_email;

    // Format settings for display
    const settingsDisplay = settings ? Object.entries(settings)
      .filter(([key]) => !key.startsWith('_')) // Filter internal keys
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n') : 'No settings';

    // Generate email HTML with comprehensive details
    const emailHTML = generateEmailHTML({
      title: `⏱️ Stuck Generation Alert - ${elapsed_minutes} minutes`,
      preheader: `Generation ${generation_id} has been running for ${elapsed_minutes} minutes without completion`,
      headerColor: elapsed_minutes >= 15 ? '#dc2626' : '#ea580c',
      headerEmoji: elapsed_minutes >= 15 ? '🚨' : '⏱️',
      sections: [
        {
          type: 'summary',
          title: 'Generation Stuck Alert',
          content: `
            <p><strong>⏱️ Time Running:</strong><br/><span style="color: ${elapsed_minutes >= 15 ? '#dc2626' : '#ea580c'}; font-size: 18px; font-weight: bold;">${elapsed_minutes} minutes</span></p>
            <p><strong>👤 User Email:</strong><br/>${user_email || 'Unknown (anonymous)'}</p>
            <p><strong>🎨 Feature Used:</strong><br/>${content_type || 'Unknown'}</p>
            <p><strong>🤖 Provider / Model:</strong><br/>${provider || 'Unknown'} / ${model_name || 'Unknown'}</p>
            <p><strong>💎 Tokens Used:</strong><br/>${tokens_used || 0}</p>
            <p><strong>📅 Started At:</strong><br/>${created_at ? new Date(created_at).toLocaleString() : 'Unknown'}</p>
          `
        },
        {
          type: 'details',
          title: '📝 Prompt',
          content: prompt ? `${prompt.substring(0, 500)}${prompt.length > 500 ? '...' : ''}` : 'No prompt available'
        },
        {
          type: 'details',
          title: '⚙️ Generation Settings',
          content: settingsDisplay
        },
        {
          type: 'details',
          title: '🔧 Technical Details',
          content: `Generation ID: ${generation_id}
User ID: ${user_id || 'Unknown'}
Content Type: ${content_type || 'Unknown'}
Provider: ${provider || 'Unknown'}
Model: ${model_name || 'Unknown'}
Status: Processing (Stuck)
Created At: ${created_at || 'Unknown'}`
        },
        {
          type: 'details',
          title: '⚠️ Possible Issues & Actions',
          content: `Possible Causes:
• Provider API may be experiencing delays
• Generation may be stuck in processing
• Webhook callback may have failed
• Model may be overloaded

Recommended Actions:
1. Check webhook logs for this generation
2. Verify provider API status
3. Consider canceling and refunding tokens
4. Check for similar stuck generations`
        },
        {
          type: 'actions',
          title: 'Quick Actions',
          content: [
            {
              label: 'View Webhook Monitor',
              url: `https://artifio.ai/admin/webhook-monitor`
            },
            {
              label: 'View Generation Ledger',
              url: `https://artifio.ai/admin/generation-ledger`
            },
            {
              label: 'View User Logs',
              url: `https://artifio.ai/admin/user-logs`
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
