import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  fullName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, fullName }: WelcomeEmailRequest = await req.json();

    console.log(`[Welcome Email] Sending to ${email} (userId: ${userId})`);

    const displayName = fullName || email.split('@')[0];

    const emailResponse = await resend.emails.send({
      from: "Artifio <onboarding@resend.dev>",
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
                  <a href="https://artifio.ai" class="cta-button">Start Creating Now →</a>
                </div>

                <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                  <strong>Need Help?</strong> Check out our tutorials or reach out to our support team. We're here to help you create amazing content!
                </p>
              </div>

              <div class="footer">
                <p>Happy Creating! 🚀</p>
                <p style="margin-top: 10px;">The Artifio Team</p>
                <p style="margin-top: 20px; font-size: 12px;">
                  <a href="https://artifio.ai" style="color: #667eea; text-decoration: none;">Visit Artifio</a> | 
                  <a href="https://artifio.ai/pricing" style="color: #667eea; text-decoration: none;">View Plans</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("[Welcome Email] Sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    return createSafeErrorResponse(error, "send-welcome-email", corsHeaders);
  }
};

serve(handler);
