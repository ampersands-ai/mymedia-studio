import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { edgeBrand, brandFrom, brandUrl } from '../_shared/brand.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));



interface WelcomeEmailRequest {
  userId: string;
  email: string;
  fullName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-welcome-email', requestId);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const { userId, email, fullName }: WelcomeEmailRequest = await req.json();

    logger.info("Sending welcome email", { 
      userId, 
      metadata: { email, fullName } 
    });

    const displayName = fullName || email.split('@')[0];

    const emailResponse = await resend.emails.send({
      from: brandFrom("", `welcome@${edgeBrand.domain}`),
      to: [email],
      subject: "Welcome to Artifio - Your Creative Journey Starts Here! 🎨",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .feature { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 6px; }
              .feature-title { font-weight: 600; color: #667eea; margin-bottom: 5px; }
              .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              .credits-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 32px;">Welcome to Artifio! 🎨</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your AI-powered creative studio</p>
              </div>
              
              <div class="content">
                <p style="font-size: 18px;">Hi ${displayName},</p>
                
                <p>Welcome to <strong>Artifio</strong> – where your creative ideas come to life! We're thrilled to have you join our community of creators.</p>
                
                <div class="credits-box">
                  <strong>🎁 Your Starting Credits:</strong><br>
                  You've been credited with <strong>5 free credits</strong> to get started! Use them to explore our AI-powered creation tools.
                </div>

                <h2 style="color: #667eea; margin-top: 30px;">What You Can Create:</h2>
                
                <div class="feature">
                  <div class="feature-title">🖼️ Custom Images</div>
                  <p style="margin: 5px 0 0 0;">Generate stunning visuals from text prompts using advanced AI models.</p>
                </div>
                
                <div class="feature">
                  <div class="feature-title">🎥 AI Videos</div>
                  <p style="margin: 5px 0 0 0;">Create engaging video content with automated scripts and voiceovers.</p>
                </div>
                
                <div class="feature">
                  <div class="feature-title">📝 Template Gallery</div>
                  <p style="margin: 5px 0 0 0;">Browse pre-built templates to jumpstart your creative projects.</p>
                </div>

                <h2 style="color: #667eea; margin-top: 30px;">Get Started in 3 Easy Steps:</h2>
                <ol style="line-height: 2;">
                  <li><strong>Explore Templates:</strong> Visit our Template Gallery for inspiration</li>
                  <li><strong>Enter Your Prompt:</strong> Describe what you want to create</li>
                  <li><strong>Generate & Download:</strong> Let AI bring your vision to life</li>
                </ol>

                <div style="text-align: center;">
                  <a href="${edgeBrand.appUrl}" class="cta-button">Start Creating Now →</a>
                </div>

                <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                  <strong>Need Help?</strong> Check out our tutorials or reach out to our support team. We're here to help you create amazing content!
                </p>
              </div>

              <div class="footer">
                <p>Happy Creating! 🚀</p>
                <p style="margin-top: 10px;">The Artifio Team</p>
                <p style="margin-top: 20px; font-size: 12px;">
                  <a href="${edgeBrand.appUrl}" style="color: #667eea; text-decoration: none;">Visit ${edgeBrand.name}</a> |
                  <a href="${brandUrl('/pricing')}" style="color: #667eea; text-decoration: none;">View Plans</a>
                </p>
                <p style="margin-top: 15px; font-size: 11px; color: #9ca3af;">
                  This is an automated message. Please do not reply to this email.<br>
                  For assistance, contact <a href="mailto:${edgeBrand.supportEmail}" style="color: #667eea;">${edgeBrand.supportEmail}</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    const { error, data } = emailResponse;

    if (error) {
      logger.error("Email sending failed", error, { userId, metadata: { email } });
      throw error;
    }

    logger.info("Welcome email sent successfully", { 
      userId, 
      metadata: { email, emailId: data?.id } 
    });

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...responseHeaders,
      },
    });
  } catch (error) {
    return createSafeErrorResponse(error, "send-welcome-email", responseHeaders);
  }
};

serve(handler);
