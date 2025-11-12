import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateEmailHTML } from "../_shared/email-templates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { generation_id, elapsed_minutes, model_name, user_email, prompt } = body;

    // Get admin email from settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notifications')
      .single();

    if (!settings?.setting_value?.error_alerts?.enabled) {
      return new Response(
        JSON.stringify({ message: 'Alerts disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const { error: emailError } = await resend.emails.send({
      from: 'Artifio Alerts <alerts@artifio.ai>',
      to: [adminEmail],
      subject: `⏱️ Generation Timeout: ${elapsed_minutes} minutes - ${generation_id.substring(0, 8)}`,
      html: emailHTML,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      throw emailError;
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: body.user_id || null,
      action: 'generation_timeout_alert',
      metadata: {
        generation_id,
        elapsed_minutes,
        model_name,
        alert_sent: true,
      }
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-generation-timeout-alert function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
