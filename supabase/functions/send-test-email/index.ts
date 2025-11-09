import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📧 Sending test email...");

    const emailResponse = await resend.emails.send({
      from: "Model Health Monitor <onboarding@resend.dev>",
      to: ["ampersands.ai@gmail.com"],
      subject: "🧪 Test Email - Model Health Dashboard",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
                border-radius: 8px 8px 0 0;
                text-align: center;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e0e0e0;
                border-top: none;
                border-radius: 0 0 8px 8px;
              }
              .badge {
                display: inline-block;
                padding: 8px 16px;
                background: #10b981;
                color: white;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                margin: 20px 0;
              }
              .info-box {
                background: #f3f4f6;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 12px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🧪 Test Email Successful!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Model Health Monitoring System</p>
            </div>
            
            <div class="content">
              <div class="badge">✅ Email System Working</div>
              
              <h2>Hello!</h2>
              
              <p>This is a test email from your Model Health Dashboard to confirm that the email system is properly configured.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">📊 System Status</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><strong>Email Service:</strong> Active ✓</li>
                  <li><strong>Resend Integration:</strong> Connected ✓</li>
                  <li><strong>Alert System:</strong> Ready ✓</li>
                  <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                </ul>
              </div>
              
              <h3>What's Next?</h3>
              <p>Your email alerts are now configured and ready to use. You'll receive notifications when:</p>
              <ul>
                <li>🚨 Model failure rates exceed thresholds</li>
                <li>⚠️ Critical system issues are detected</li>
                <li>📈 Important health status changes occur</li>
              </ul>
              
              <p><strong>Note:</strong> This test email is sent from Resend's default domain (<code>onboarding@resend.dev</code>). For production use, consider verifying your own domain at <a href="https://resend.com/domains">resend.com/domains</a>.</p>
            </div>
            
            <div class="footer">
              <p>Sent by Model Health Monitoring System</p>
              <p style="color: #999;">This is an automated test email.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("✅ Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Test email sent successfully",
        emailResponse,
        recipient: "ampersands.ai@gmail.com"
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
    console.error("❌ Error sending test email:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        hint: "Make sure RESEND_API_KEY is configured and your domain is verified at resend.com/domains"
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
});
