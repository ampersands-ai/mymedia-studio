import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { edgeBrand, brandFrom } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface SubscribeRequest {
  email: string;
  source?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, source = "website" }: SubscribeRequest = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalizedEmail = email.toLowerCase().trim();

    // Upsert to handle resubscriptions
    const { error: dbError } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { 
          email: normalizedEmail, 
          source,
          is_active: true,
          subscribed_at: new Date().toISOString()
        },
        { onConflict: "email" }
      );

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to subscribe. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate unsubscribe token (base64 encoded email for simplicity)
    const unsubscribeToken = btoa(normalizedEmail);
    const unsubscribeUrl = `${edgeBrand.appUrl}/unsubscribe?token=${unsubscribeToken}`;

    // Send confirmation email
    try {
      await resend.emails.send({
        from: brandFrom('Newsletter', edgeBrand.noreplyEmail),
        to: [normalizedEmail],
        subject: `Welcome to the ${edgeBrand.name} Newsletter! 🎨`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
                .highlight { background: #f0f9ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                .unsubscribe { color: #9ca3af; font-size: 11px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 28px;">You're In! 🎉</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Welcome to the ${edgeBrand.name} Newsletter</p>
                </div>
                
                <div class="content">
                  <p style="font-size: 16px;">Thanks for subscribing!</p>
                  
                  <p>You'll now receive:</p>
                  
                  <div class="highlight">
                    <ul style="margin: 0; padding-left: 20px;">
                      <li><strong>New Feature Announcements</strong> – Be the first to know about our latest AI tools</li>
                      <li><strong>Tips & Tutorials</strong> – Get the most out of ${edgeBrand.name}</li>
                      <li><strong>Exclusive Offers</strong> – Special deals just for subscribers</li>
                      <li><strong>Creative Inspiration</strong> – See what others are creating</li>
                    </ul>
                  </div>

                  <div style="text-align: center;">
                    <a href="${edgeBrand.appUrl}" class="cta-button">Explore ${edgeBrand.name} &rarr;</a>
                  </div>

                  <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                    We respect your inbox and only send valuable content. You can unsubscribe anytime.
                  </p>
                </div>

                <div class="footer">
                  <p>Happy Creating! 🚀</p>
                  <p style="margin-top: 10px;">The ${edgeBrand.name} Team</p>
                  <p class="unsubscribe">
                    <a href="${unsubscribeUrl}" style="color: #9ca3af;">Unsubscribe</a> | 
                    <a href="${edgeBrand.appUrl}/privacy" style="color: #9ca3af;">Privacy Policy</a>
                  </p>
                  <p style="margin-top: 10px; font-size: 11px; color: #9ca3af;">
                    This is an automated message. Please do not reply to this email.<br>
                    For assistance, contact <a href="mailto:${edgeBrand.supportEmail}" style="color: #667eea;">${edgeBrand.supportEmail}</a>
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      console.log("Newsletter confirmation email sent to:", normalizedEmail);
    } catch (emailError) {
      // Log but don't fail the subscription if email fails
      console.error("Failed to send confirmation email:", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Successfully subscribed!" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in subscribe-newsletter:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
