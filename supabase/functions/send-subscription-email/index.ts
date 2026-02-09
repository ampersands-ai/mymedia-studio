/**
 * Send Subscription Email Edge Function
 * 
 * Sends branded emails for subscription events:
 * - activated: New subscription (with payment receipt)
 * - upgraded: Plan upgrade
 * - downgraded: Plan downgrade
 * - cancelled: Subscription cancelled
 * - renewed: Subscription renewed (with payment receipt)
 * - boost_purchased: Credit boost purchase
 * - resubscribed: Resubscription during grace period
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { edgeBrand, brandFrom } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface SubscriptionEmailRequest {
  user_id: string;
  email: string;
  event_type: 'activated' | 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'boost_purchased' | 'resubscribed';
  plan_name: string;
  previous_plan?: string;
  tokens_added?: number;
  // Payment receipt fields
  amount_paid?: number;  // in cents (e.g., 1999 for $19.99)
  currency?: string;     // e.g., 'USD'
  invoice_id?: string;   // Payment/invoice ID
  next_billing_date?: string; // ISO date string
  payment_method_last4?: string; // Last 4 digits of card
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  freemium: 'Freemium',
  explorer: 'Explorer',
  professional: 'Professional',
  ultimate: 'Ultimate',
  studio: 'Studio',
  veo_connoisseur: 'Studio',
};

const PLAN_PRICES: Record<string, number> = {
  explorer: 799,       // $7.99
  professional: 1999,  // $19.99
  ultimate: 4499,      // $44.99
  studio: 7499,        // $74.99
  veo_connoisseur: 7499,
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SEND-SUBSCRIPTION-EMAIL] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function generateUnsubscribeUrl(token: string): string {
  const baseUrl = Deno.env.get("SUPABASE_URL") || "https://gzlwkvmivbfcvczoqphq.supabase.co";
  return `${baseUrl}/functions/v1/handle-unsubscribe?token=${token}&type=subscription`;
}

function formatCurrency(amountInCents: number, currency: string = 'USD'): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function generateReceiptSection(
  amountPaid: number | undefined, 
  currency: string = 'USD',
  invoiceId: string | undefined,
  nextBillingDate: string | undefined,
  paymentMethodLast4: string | undefined,
  planName: string
): string {
  // Use provided amount or fall back to plan default price
  const amount = amountPaid || PLAN_PRICES[planName] || 0;
  
  if (!amount) return '';

  const paymentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
        📧 Payment Receipt
      </div>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Amount Charged</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatCurrency(amount, currency)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Payment Date</td>
          <td style="padding: 8px 0; text-align: right;">${paymentDate}</td>
        </tr>
        ${invoiceId ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Transaction ID</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${invoiceId.slice(0, 20)}${invoiceId.length > 20 ? '...' : ''}</td>
        </tr>
        ` : ''}
        ${paymentMethodLast4 ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Payment Method</td>
          <td style="padding: 8px 0; text-align: right;">•••• ${paymentMethodLast4}</td>
        </tr>
        ` : ''}
        ${nextBillingDate ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Next Billing Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatDate(nextBillingDate)}</td>
        </tr>
        ` : ''}
      </table>
    </div>
  `;
}

function generateAutoRenewalNotice(nextBillingDate: string | undefined): string {
  const nextDate = nextBillingDate ? formatDate(nextBillingDate) : 'your next billing cycle';
  return `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-size: 13px;">
      <p style="margin: 0; color: #92400e;">
        <strong>Auto-Renewal Notice:</strong> Your subscription will automatically renew on ${nextDate} unless you cancel. 
        You can manage or cancel your subscription anytime from your <a href="${edgeBrand.appUrl}/dashboard/settings" style="color: #f97316; text-decoration: underline;">account settings</a>.
      </p>
    </div>
  `;
}

interface EmailContentParams {
  eventType: string;
  planName: string;
  previousPlan?: string;
  tokensAdded?: number;
  unsubscribeUrl?: string;
  amountPaid?: number;
  currency?: string;
  invoiceId?: string;
  nextBillingDate?: string;
  paymentMethodLast4?: string;
}

function getEmailContent(params: EmailContentParams) {
  const { 
    eventType, 
    planName, 
    previousPlan, 
    tokensAdded, 
    unsubscribeUrl,
    amountPaid,
    currency = 'USD',
    invoiceId,
    nextBillingDate,
    paymentMethodLast4
  } = params;

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

  const receiptSection = generateReceiptSection(amountPaid, currency, invoiceId, nextBillingDate, paymentMethodLast4, planName);
  const autoRenewalNotice = generateAutoRenewalNotice(nextBillingDate);

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
                  
                  ${receiptSection}
                  ${autoRenewalNotice}
                  
                  <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #c2410c;"><strong>What's next?</strong></p>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #7c2d12;">
                      <li>Explore our AI video generation tools</li>
                      <li>Create stunning images with cutting-edge models</li>
                      <li>Generate professional voiceovers</li>
                    </ul>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${edgeBrand.appUrl}/dashboard" style="display: inline-block; padding: 14px 28px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Creating</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Thank you for choosing ${edgeBrand.name}!</p>
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
                  
                  ${receiptSection}
                  ${autoRenewalNotice}
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${edgeBrand.appUrl}/dashboard" style="display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Explore New Features</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Thank you for your continued trust in ${edgeBrand.name}!</p>
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
                    <a href="${edgeBrand.appUrl}/pricing" style="display: inline-block; padding: 14px 28px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">View Plans</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Questions? Contact us at <a href="mailto:${edgeBrand.supportEmail}" style="color: #f97316;">${edgeBrand.supportEmail}</a></p>
                  <p style="margin: 10px 0 0 0; font-size: 11px; color: #9ca3af;">
                    This is an automated message. Please do not reply to this email.
                  </p>
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
                  <p style="font-size: 16px;">Your credits have been frozen for 30 days. If you resubscribe within this period, your credits will be restored.</p>
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #b45309;"><strong>Changed your mind?</strong> You can resubscribe within 30 days to restore your frozen credits and continue where you left off.</p>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${edgeBrand.appUrl}/pricing" style="display: inline-block; padding: 14px 28px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Resubscribe</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Thank you for trying ${edgeBrand.name}!</p>
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
                  
                  ${receiptSection}
                  
                  <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; font-size: 13px;">
                    <p style="margin: 0; color: #065f46;">
                      <strong>This was an automatic renewal.</strong> Your subscription will continue to renew${nextBillingDate ? ` on ${formatDate(nextBillingDate)}` : ' each billing cycle'} unless you cancel. 
                      <a href="${edgeBrand.appUrl}/dashboard/settings" style="color: #f97316; text-decoration: underline;">Manage subscription</a>
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${edgeBrand.appUrl}/dashboard" style="display: inline-block; padding: 14px 28px; background: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Continue Creating</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Thank you for being a valued ${edgeBrand.name} subscriber!</p>
                </div>
                ${unsubscribeFooter}
              </div>
            </body>
          </html>
        `,
      };

    case 'boost_purchased':
      return {
        subject: `⚡ Credit Boost Purchased - ${tokensAdded?.toLocaleString()} credits added!`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">⚡ Credit Boost Added!</h1>
                  <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">${tokensAdded?.toLocaleString()} credits have been added to your account</p>
                </div>
                <div style="padding: 30px;">
                  <p style="font-size: 16px;">Your credit boost purchase has been completed successfully!</p>
                  <p style="font-size: 16px;">You now have <strong>${tokensAdded?.toLocaleString()} additional credits</strong> to use for your creative projects.</p>
                  
                  ${receiptSection}
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${edgeBrand.appUrl}/dashboard" style="display: inline-block; padding: 14px 28px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Use Your Credits</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Thank you for your purchase!</p>
                </div>
                ${unsubscribeFooter}
              </div>
            </body>
          </html>
        `,
      };

    case 'resubscribed':
      return {
        subject: `🎉 Welcome back! Your ${displayPlan} subscription is active`,
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
                  <h1 style="margin: 0; font-size: 28px;">🎉 Welcome Back!</h1>
                  <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">Your ${displayPlan} subscription is now active</p>
                </div>
                <div style="padding: 30px;">
                  <p style="font-size: 16px;">Great to have you back! Your <strong>${displayPlan}</strong> subscription has been reactivated.</p>
                  ${tokensAdded ? `
                  <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #065f46;"><strong>Good news!</strong> Your ${tokensAdded.toLocaleString()} frozen credits have been restored to your account.</p>
                  </div>
                  ` : ''}
                  
                  ${receiptSection}
                  ${autoRenewalNotice}
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${edgeBrand.appUrl}/dashboard" style="display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Creating Again</a>
                  </div>
                </div>
                <div style="padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0;">Thank you for coming back to ${edgeBrand.name}!</p>
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

    const requestBody: SubscriptionEmailRequest = await req.json();
    const { 
      user_id, 
      email, 
      event_type, 
      plan_name, 
      previous_plan, 
      tokens_added,
      amount_paid,
      currency,
      invoice_id,
      next_billing_date,
      payment_method_last4
    } = requestBody;
    
    logStep("Request received", { user_id, event_type, plan_name, amount_paid });

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

    // Get email content with receipt info
    const { subject, html } = getEmailContent({
      eventType: event_type,
      planName: plan_name,
      previousPlan: previous_plan,
      tokensAdded: tokens_added,
      unsubscribeUrl,
      amountPaid: amount_paid,
      currency,
      invoiceId: invoice_id,
      nextBillingDate: next_billing_date,
      paymentMethodLast4: payment_method_last4,
    });

    // Send email
    const emailResponse = await resend.emails.send({
      from: brandFrom('Notifications', edgeBrand.noreplyEmail),
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
      metadata: { 
        plan_name, 
        previous_plan, 
        tokens_added,
        amount_paid,
        currency,
        invoice_id,
        next_billing_date,
      },
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
