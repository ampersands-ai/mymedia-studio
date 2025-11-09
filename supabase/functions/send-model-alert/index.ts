import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  to: string;
  userName: string;
  modelId: string;
  failureRate: string;
  failedCount: number;
  totalCount: number;
  threshold: number;
  timeWindow: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      userName,
      modelId,
      failureRate,
      failedCount,
      totalCount,
      threshold,
      timeWindow,
    }: AlertEmailRequest = await req.json();

    console.log(`📧 Sending model alert email to ${to}...`);

    const emailResponse = await resend.emails.send({
      from: "Artifio Alerts <hello@artifio.ai>",
      to: [to],
      subject: `⚠️ Model Alert: ${modelId} Failure Rate at ${failureRate}%`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 0;
                background-color: #f9fafb;
              }
              .container {
                background-color: #ffffff;
                margin: 20px;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                background: linear-gradient(135deg, #FDB022 0%, #FB923C 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
              }
              .header p {
                margin: 10px 0 0 0;
                opacity: 0.95;
                font-size: 16px;
              }
              .content {
                padding: 40px 30px;
              }
              .alert-badge {
                display: inline-block;
                padding: 10px 20px;
                background: linear-gradient(135deg, #FDB022 0%, #FB923C 100%);
                color: white;
                border-radius: 25px;
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 25px;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 30px 0;
              }
              .stat-card {
                background: linear-gradient(135deg, #fff5e6 0%, #fff0d6 100%);
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                border: 2px solid #FDB022;
              }
              .stat-value {
                font-size: 32px;
                font-weight: 800;
                background: linear-gradient(135deg, #FDB022 0%, #FB923C 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin: 0;
              }
              .stat-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 5px;
                font-weight: 600;
              }
              .info-box {
                background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
                padding: 25px;
                border-radius: 10px;
                margin: 25px 0;
                border-left: 4px solid #FDB022;
              }
              .info-box h3 {
                margin-top: 0;
                color: #111;
                font-size: 18px;
              }
              .info-box ul {
                margin: 10px 0;
                padding-left: 20px;
              }
              .info-box li {
                margin: 8px 0;
                color: #444;
              }
              .model-name {
                display: inline-block;
                padding: 8px 16px;
                background: linear-gradient(135deg, #FDB022 0%, #FB923C 100%);
                color: white;
                border-radius: 20px;
                font-weight: 700;
                font-size: 16px;
                margin: 10px 0;
              }
              .btn {
                display: inline-block;
                padding: 14px 32px;
                background: linear-gradient(135deg, #FDB022 0%, #FB923C 100%);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 700;
                margin: 20px 0;
                box-shadow: 0 4px 10px rgba(253, 176, 34, 0.3);
                transition: transform 0.2s;
              }
              .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 15px rgba(253, 176, 34, 0.4);
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 12px;
                padding: 30px;
                border-top: 1px solid #e5e7eb;
              }
              .footer a {
                color: #FB923C;
                text-decoration: none;
                font-weight: 600;
              }
              @media only screen and (max-width: 600px) {
                .container {
                  margin: 10px;
                }
                .header, .content {
                  padding: 25px 20px;
                }
                .stats-grid {
                  grid-template-columns: 1fr;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ Model Health Alert</h1>
                <p>Critical failure rate detected</p>
              </div>
              
              <div class="content">
                <span class="alert-badge">🚨 Alert Triggered</span>
                
                <h2>Hello ${userName},</h2>
                
                <p>Your AI model has exceeded the configured failure threshold and requires immediate attention.</p>
                
                <p><strong>Affected Model:</strong></p>
                <span class="model-name">${modelId}</span>

                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-value">${failureRate}%</div>
                    <div class="stat-label">Failure Rate</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${threshold}%</div>
                    <div class="stat-label">Threshold</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${failedCount}</div>
                    <div class="stat-label">Failed Attempts</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${totalCount}</div>
                    <div class="stat-label">Total Requests</div>
                  </div>
                </div>
                
                <div class="info-box">
                  <h3>📊 Alert Details</h3>
                  <ul>
                    <li><strong>Time Window:</strong> Last ${timeWindow} minutes</li>
                    <li><strong>Failed Requests:</strong> ${failedCount} out of ${totalCount}</li>
                    <li><strong>Threshold Exceeded:</strong> ${(parseFloat(failureRate) - threshold).toFixed(2)}% over limit</li>
                    <li><strong>Alert Time:</strong> ${new Date().toLocaleString('en-US', { 
                      timeZone: 'UTC',
                      dateStyle: 'full',
                      timeStyle: 'long'
                    })}</li>
                  </ul>
                </div>
                
                <div class="info-box">
                  <h3>🔧 Recommended Actions</h3>
                  <ul>
                    <li>Check your model configuration and API credentials</li>
                    <li>Review recent generation logs for error patterns</li>
                    <li>Verify that your API provider is operational</li>
                    <li>Consider adjusting model parameters or switching providers</li>
                    <li>Monitor the dashboard for continued issues</li>
                  </ul>
                </div>

                <center>
                  <a href="https://artifio.ai/admin/model-health" class="btn">
                    View Health Dashboard →
                  </a>
                </center>

                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                  <strong>Note:</strong> You're receiving this email because you've configured alerts for this model. 
                  To adjust alert settings or disable notifications, visit your dashboard.
                </p>
              </div>
              
              <div class="footer">
                <p><strong>Artifio</strong> - Professional AI Content Platform</p>
                <p>
                  <a href="https://artifio.ai">Visit Dashboard</a> • 
                  <a href="https://artifio.ai/settings">Manage Alerts</a>
                </p>
                <p style="color: #999; margin-top: 15px;">
                  This is an automated alert from your Artifio monitoring system.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("✅ Alert email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Alert email sent successfully",
        emailResponse,
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
    console.error("❌ Error sending alert email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
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
