import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateEmailHTML } from "../_shared/email-templates.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));



serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-new-user-alert', requestId);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    
    // Get admin notification settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notifications')
      .single();

    if (!settings?.setting_value?.user_registration?.enabled) {
      return new Response(
        JSON.stringify({ message: 'User registration alerts disabled' }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminEmail = settings.setting_value.admin_email;
    
    // Generate email HTML
    const emailHTML = generateEmailHTML({
      title: `New User Registration`,
      preheader: `${body.email} just signed up`,
      headerColor: '#16a34a',
      headerEmoji: '🎉',
      sections: [
        {
          type: 'summary',
          title: 'User Information',
          content: `
            <p><strong>Email:</strong> ${body.email}</p>
            ${body.full_name ? `<p><strong>Name:</strong> ${body.full_name}</p>` : ''}
            ${body.phone_number ? `<p><strong>Phone:</strong> ${body.phone_number}</p>` : ''}
            ${body.country ? `<p><strong>Location:</strong> ${body.country}${body.zipcode ? `, ${body.zipcode}` : ''}</p>` : ''}
            <p><strong>Signup Method:</strong> ${body.signup_method}</p>
            <p><strong>Registered:</strong> Just now</p>
          `
        },
        {
          type: 'summary',
          title: 'Account Details',
          content: `
            <p><strong>Plan:</strong> Freemium (5 credits)</p>
            <p><strong>Email Verified:</strong> ${body.signup_method !== 'email' ? 'Yes (via OAuth)' : 'Pending'}</p>
            <p><strong>Onboarding:</strong> 0% complete</p>
          `
        },
        {
          type: 'actions',
          title: 'Quick Actions',
          content: [
            {
              label: 'View User Profile',
              url: `https://artifio.ai/admin/users`
            },
            {
              label: 'View Activity Logs',
              url: `https://artifio.ai/admin/user-logs`
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
      subject: `🎉 New User Registration - ${body.email}`,
      html: emailHTML,
    });

    if (emailError) {
      logger.error("Failed to send email", emailError as Error, { 
        metadata: { adminEmail, userEmail: body.email } 
      });
      throw emailError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error("Error in send-new-user-alert function", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
