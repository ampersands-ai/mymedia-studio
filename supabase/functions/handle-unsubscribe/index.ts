/**
 * Handle Unsubscribe Edge Function
 * 
 * Handles one-click email unsubscribe via token
 * Updates user notification preferences based on email type
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { edgeBrand } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[HANDLE-UNSUBSCRIBE] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function generateHtmlResponse(success: boolean, message: string): string {
  const bgColor = success ? '#10b981' : '#ef4444';
  const icon = success ? '✓' : '✗';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Preferences - ${edgeBrand.name}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          }
          .container {
            max-width: 480px;
            margin: 20px;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
          }
          .header {
            background: ${bgColor};
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 15px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .content p {
            color: #6b7280;
            margin: 0 0 20px 0;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #f97316;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            transition: background 0.2s;
          }
          .button:hover {
            background: #ea580c;
          }
          .footer {
            padding: 20px 30px;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">${icon}</div>
            <h1>${success ? 'Successfully Unsubscribed' : 'Something went wrong'}</h1>
          </div>
          <div class="content">
            <p>${message}</p>
            <a href="${edgeBrand.appUrl}/dashboard/settings?tab=notifications" class="button">
              Manage Email Preferences
            </a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${edgeBrand.name}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const emailType = url.searchParams.get('type') || 'subscription';

    if (!token) {
      return new Response(generateHtmlResponse(false, 'Invalid unsubscribe link. The token is missing.'), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
        status: 400,
      });
    }

    logStep("Token received", { emailType });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find user by unsubscribe token
    const { data: prefs, error: findError } = await supabaseClient
      .from('user_notification_preferences')
      .select('user_id')
      .eq('unsubscribe_token', token)
      .maybeSingle();

    if (findError || !prefs) {
      logStep("Token not found or invalid", { token: token.substring(0, 8) + '...' });
      return new Response(generateHtmlResponse(false, 'This unsubscribe link is invalid or has expired. Please visit your settings to manage your email preferences.'), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
        status: 404,
      });
    }

    // Determine which preference to update based on email type
    const updateData: Record<string, boolean | string> = {
      updated_at: new Date().toISOString(),
    };

    switch (emailType) {
      case 'subscription':
        updateData.email_on_subscription_change = false;
        break;
      case 'completion':
        updateData.email_on_completion = false;
        break;
      case 'marketing':
        updateData.email_marketing = false;
        break;
      case 'all':
        updateData.email_on_subscription_change = false;
        updateData.email_on_completion = false;
        updateData.email_marketing = false;
        break;
      default:
        updateData.email_on_subscription_change = false;
    }

    // Update preferences
    const { error: updateError } = await supabaseClient
      .from('user_notification_preferences')
      .update(updateData)
      .eq('user_id', prefs.user_id);

    if (updateError) {
      logStep("Failed to update preferences", { error: updateError.message });
      return new Response(generateHtmlResponse(false, 'We couldn\'t update your preferences. Please try again or visit your settings.'), {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
        status: 500,
      });
    }

    logStep("Preferences updated successfully", { userId: prefs.user_id, emailType });

    const typeMessages: Record<string, string> = {
      subscription: 'You will no longer receive subscription-related emails (upgrades, renewals, cancellations).',
      completion: 'You will no longer receive emails when your generations complete.',
      marketing: 'You will no longer receive marketing and product update emails.',
      all: 'You have been unsubscribed from all email notifications.',
    };

    const message = typeMessages[emailType] || typeMessages.subscription;

    return new Response(generateHtmlResponse(true, `${message} You can always re-enable notifications in your account settings.`), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(generateHtmlResponse(false, 'An unexpected error occurred. Please try again later.'), {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
      status: 500,
    });
  }
});
