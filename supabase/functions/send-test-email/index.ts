import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));



Deno.serve(async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-test-email', requestId);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch admin email from settings
    const { data: settings, error: settingsError } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "admin_notifications")
      .single();

    if (settingsError || !settings) {
      throw new Error("Admin email not configured in settings");
    }

    const adminEmail = settings.setting_value?.admin_email;
    if (!adminEmail) {
      throw new Error("Admin email not found in admin_notifications settings");
    }

    logger.info("Sending test email to admin", { metadata: { adminEmail } });

    const emailResponse = await resend.emails.send({
      from: "Artifio System <noreply@artifio.ai>",
      to: [adminEmail],
      subject: "✅ Test Email - Email System Working!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e0e0e0;
                border-top: none;
              }
              .footer {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 0 0 10px 10px;
                text-align: center;
                color: #6c757d;
                font-size: 14px;
                border: 1px solid #e0e0e0;
                border-top: none;
              }
              .badge {
                display: inline-block;
                background: #28a745;
                color: white;
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                margin: 10px 0;
              }
              .feature {
                background: #f8f9fa;
                padding: 15px;
                margin: 15px 0;
                border-left: 4px solid #667eea;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎉 Test Email Successful!</h1>
              <p>Your email system is working perfectly</p>
            </div>
            
            <div class="content">
              <p>Hi <strong>Admin</strong>,</p>
              
              <p>This is a test email from your application's email system. If you're seeing this, it means:</p>
              
              <div class="feature">
                <strong>✅ Resend Integration:</strong> Successfully connected and authenticated
              </div>
              
              <div class="feature">
                <strong>✅ Edge Function:</strong> send-test-email is working correctly
              </div>
              
              <div class="feature">
                <strong>✅ Email Delivery:</strong> Emails are being delivered successfully
              </div>
              
              <p>You can now use this email system to send:</p>
              <ul>
                <li>Welcome emails to new users</li>
                <li>Password reset notifications</li>
                <li>System alerts and notifications</li>
                <li>Custom transactional emails</li>
              </ul>
              
              <p style="margin-top: 30px;">
                <span class="badge">SYSTEM STATUS: OPERATIONAL</span>
              </p>
            </div>
            
            <div class="footer">
              <p>This is an automated test email sent at ${new Date().toLocaleString()}</p>
              <p style="color: #999; font-size: 12px; margin-top: 10px;">
                Sent via Resend • Powered by Supabase Edge Functions
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Test email sent successfully:", emailResponse);

    // Log to email_history
    await supabase.from("email_history").insert({
      recipient_email: adminEmail,
      email_type: "test",
      subject: "✅ Test Email - Email System Working!",
      delivery_status: "sent",
      resend_email_id: (emailResponse as any).data?.id || (emailResponse as any).id,
      metadata: { test: true }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Test email sent to admin: ${adminEmail}`,
        data: emailResponse 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    logger.error("Error sending test email", error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
