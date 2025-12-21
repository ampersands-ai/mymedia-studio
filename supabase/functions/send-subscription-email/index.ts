/**
 * Send Subscription Email Edge Function
 * 
 * Sends branded emails for subscription events:
 * - activated: New subscription
 * - upgraded: Plan upgrade
 * - downgraded: Plan downgrade
 * - cancelled: Subscription cancelled
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface SubscriptionEmailRequest {
  user_id: string;
  email: string;
  event_type: 'activated' | 'upgraded' | 'downgraded' | 'cancelled' | 'renewed';
  plan_name: string;
  previous_plan?: string;
  tokens_added?: number;
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  freemium: 'Freemium',
  explorer: 'Explorer',
  professional: 'Professional',
  ultimate: 'Ultimate',
  veo_connoisseur: 'Veo Connoisseur',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SEND-SUBSCRIPTION-EMAIL] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function generateUnsubscribeUrl(token: string): string {
  const baseUrl = Deno.env.get("SUPABASE_URL") || "https://gzlwkvmivbfcvczoqphq.supabase.co";
  return `${baseUrl}/functions/v1/handle-unsubscribe?token=${token}&type=subscription`;
}

function getEmailContent(eventType: string, planName: string, previousPlan?: string, tokensAdded?: number, unsubscribeUrl?: string) {
  const displayPlan = PLAN_DISPLAY_NAMES[planName] || planName;
  const displayPreviousPlan = previousPlan ? (PLAN_DISPLAY_NAMES[previousPlan] || previousPlan) : '';
  
  const unsubscribeFooter = unsubscribeUrl ? `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px;">
        Don't want to receive subscription emails? 
        <a href="${unsubscribeUrl}" style="color: #f97316; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
  ` : '';

  switch (eventType) {
    case 'activated':
      return {
        subject: `🎉 Welcome to ${displayPlan}! Your subscription is active`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to ${displayPlan}!</h1>
                  <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">Your subscription is now active</p>
                </div>
                <div style="padding: 30px;">
                  <p style="font-size: 16px;">Your <strong>${displayPlan}</strong> subscription has been successfully activated!</p>
                  ${tokensAdded ? `<p style="font-size: 16px;">You've received <strong>${tokensAdded.toLocaleString()} credits</strong> to start creating amazing content.</p>` : ''}
                  <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #c2410c;"><strong>What's next?</strong></p>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #7c2d12;">
                      <li>Explore our AI video generation tools</li>
                      <li>Create stunning images with cutting-edge models</li>
                      <li>Generate professional voiceovers</li>
                    </ul>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://artifio.ai/dashboard" style="display: inline-block; padding: 14px 28px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Creating</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Thank you for choosing Artifio!</p>
                </div>
                ${unsubscribeFooter}
              </div>
            </body>
          </html>
        `,
      };

    case 'upgraded':
      return {
        subject: `🚀 You've upgraded to ${displayPlan}!`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">🚀 Upgrade Complete!</h1>
                  <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">You're now on ${displayPlan}</p>
                </div>
                <div style="padding: 30px;">
                  <p style="font-size: 16px;">Great news! You've successfully upgraded from <strong>${displayPreviousPlan}</strong> to <strong>${displayPlan}</strong>.</p>
                  <p style="font-size: 16px;">You now have access to more features and credits to power your creative projects.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://artifio.ai/dashboard" style="display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Explore New Features</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Thank you for your continued trust in Artifio!</p>
                </div>
                ${unsubscribeFooter}
              </div>
            </body>
          </html>
        `,
      };

    case 'downgraded':
      return {
        subject: `Your plan has been changed to ${displayPlan}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">Plan Updated</h1>
                  <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">Your subscription has been changed</p>
                </div>
                <div style="padding: 30px;">
                  <p style="font-size: 16px;">Your subscription has been changed from <strong>${displayPreviousPlan}</strong> to <strong>${displayPlan}</strong>.</p>
                  <p style="font-size: 16px;">Your remaining credits will continue to work, and you'll receive your new credit allocation at your next billing cycle.</p>
                  <div style="background: #eef2ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #4338ca;">Need more power? You can upgrade anytime from your settings.</p>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://artifio.ai/pricing" style="display: inline-block; padding: 14px 28px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">View Plans</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Questions? Contact us at support@artifio.ai</p>
                </div>
                ${unsubscribeFooter}
              </div>
            </body>
          </html>
        `,
      };

    case 'cancelled':
      return {
        subject: `😢 We're sad to see you go`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); color: white; padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">Subscription Cancelled</h1>
                  <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">We hope to see you again soon</p>
                </div>
                <div style="padding: 30px;">
                  <p style="font-size: 16px;">Your <strong>${displayPlan}</strong> subscription has been cancelled.</p>
                  <p style="font-size: 16px;">You've been moved to our free plan with 5 credits. Your account and all your creations are still accessible.</p>
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #b45309;"><strong>Changed your mind?</strong> You can resubscribe anytime to unlock premium features and get more credits.</p>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://artifio.ai/pricing" style="display: inline-block; padding: 14px 28px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Resubscribe</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Thank you for trying Artifio!</p>
                </div>
                ${unsubscribeFooter}
              </div>
            </body>
          </html>
        `,
      };

    case 'renewed':
      return {
        subject: `✨ Your ${displayPlan} subscription has been renewed`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">✨ Subscription Renewed!</h1>
                  <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">Your ${displayPlan} plan continues</p>
                </div>
                <div style="padding: 30px;">
                  <p style="font-size: 16px;">Your <strong>${displayPlan}</strong> subscription has been successfully renewed!</p>
                  ${tokensAdded ? `<p style="font-size: 16px;">You've received <strong>${tokensAdded.toLocaleString()} fresh credits</strong> to continue creating amazing content.</p>` : ''}
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://artifio.ai/dashboard" style="display: inline-block; padding: 14px 28px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Continue Creating</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Thank you for being a valued Artifio subscriber!</p>
                </div>
                ${unsubscribeFooter}
              </div>
            </body>
          </html>
        `,
      };

    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { user_id, email, event_type, plan_name, previous_plan, tokens_added }: SubscriptionEmailRequest = await req.json();
    logStep("Request received", { user_id, event_type, plan_name });

    if (!user_id || !email || !event_type || !plan_name) {
      throw new Error("Missing required fields: user_id, email, event_type, plan_name");
    }

    // Check user preferences
    const { data: prefs } = await supabaseClient
      .from('user_notification_preferences')
      .select('email_on_subscription_change, unsubscribe_token')
      .eq('user_id', user_id)
      .maybeSingle();

    // Default to sending if no preferences found
    const shouldSend = prefs?.email_on_subscription_change !== false;
    
    if (!shouldSend) {
      logStep("User has disabled subscription emails", { user_id });
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "User disabled subscription emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Generate unsubscribe URL
    const unsubscribeUrl = prefs?.unsubscribe_token ? generateUnsubscribeUrl(prefs.unsubscribe_token) : undefined;

    // Get email content
    const { subject, html } = getEmailContent(event_type, plan_name, previous_plan, tokens_added, unsubscribeUrl);

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Artifio <notifications@artifio.ai>",
      to: [email],
      subject,
      html,
    });

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    // Log to email_history
    await supabaseClient.from('email_history').insert({
      user_id,
      recipient_email: email,
      email_type: `subscription_${event_type}`,
      subject,
      delivery_status: 'sent',
      resend_email_id: emailResponse.data?.id,
      metadata: { plan_name, previous_plan, tokens_added },
    });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
