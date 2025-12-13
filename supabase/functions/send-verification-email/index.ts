import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  userId?: string;
  email?: string;
  fullName?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get user from auth header or request body
    const authHeader = req.headers.get("Authorization");
    let userId: string;
    let email: string;
    let fullName: string = "";

    const body: VerificationEmailRequest = await req.json().catch(() => ({}));

    if (authHeader) {
      // Authenticated user requesting verification
      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) {
        console.error("[send-verification-email] Auth error:", authError);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = user.id;
      email = user.email!;
      fullName = user.user_metadata?.full_name || "";
    } else if (body.userId && body.email) {
      // Service-to-service call (e.g., from signup flow)
      userId = body.userId;
      email = body.email;
      fullName = body.fullName || "";
    } else {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: Check for recent verification emails (1 per 60 seconds)
    const { data: recentTokens, error: tokenCheckError } = await supabaseAdmin
      .from("email_verification_tokens")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (tokenCheckError) {
      console.error("[send-verification-email] Token check error:", tokenCheckError);
    }

    if (recentTokens && recentTokens.length > 0) {
      const lastSentAt = new Date(recentTokens[0].created_at);
      const secondsRemaining = Math.ceil(60 - (Date.now() - lastSentAt.getTime()) / 1000);
      return new Response(
        JSON.stringify({ 
          error: "Rate limited", 
          message: `Please wait ${secondsRemaining} seconds before requesting another verification email`,
          retryAfter: secondsRemaining
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure verification token
    const token = crypto.randomUUID();

    // Store token in database
    const { error: insertError } = await supabaseAdmin
      .from("email_verification_tokens")
      .insert({
        user_id: userId,
        token,
        email,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });

    if (insertError) {
      console.error("[send-verification-email] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build verification URL
    const appUrl = Deno.env.get("APP_URL") || "https://artifio.ai";
    const verificationUrl = `${appUrl}/verify-email?token=${token}`;

    // Send branded verification email
    const emailResponse = await resend.emails.send({
      from: "Artifio <noreply@artifio.ai>",
      to: [email],
      subject: "Verify your email address - Artifio",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <tr>
              <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; padding: 40px;">
                <!-- Logo -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="text-align: center; padding-bottom: 30px;">
                      <span style="font-size: 28px; font-weight: 800; color: #ffffff;">artifio.ai</span>
                    </td>
                  </tr>
                </table>
                
                <!-- Main Content -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="text-align: center; padding-bottom: 20px;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                        Verify your email address
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding-bottom: 30px;">
                      <p style="margin: 0; font-size: 16px; line-height: 24px; color: #a0a0a0;">
                        ${fullName ? `Hi ${fullName.split(' ')[0]},` : 'Hi there,'}<br><br>
                        Thanks for signing up for Artifio! Please verify your email address to unlock all features.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding-bottom: 30px;">
                      <a href="${verificationUrl}" 
                         style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 12px;">
                        Verify Email Address
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding-bottom: 20px;">
                      <p style="margin: 0; font-size: 14px; color: #666666;">
                        This link will expire in 24 hours.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding-bottom: 20px;">
                      <p style="margin: 0; font-size: 13px; color: #555555;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${verificationUrl}" style="color: #f97316; word-break: break-all;">${verificationUrl}</a>
                      </p>
                    </td>
                  </tr>
                </table>
                
                <!-- Footer -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="text-align: center; padding-top: 30px; border-top: 1px solid #2a2a2a;">
                      <p style="margin: 0; font-size: 12px; color: #555555;">
                        If you didn't create an account with Artifio, you can safely ignore this email.
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 12px; color: #555555;">
                        © ${new Date().getFullYear()} Artifio. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log(`[send-verification-email] Email sent successfully to ${email} in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent",
        emailId: emailResponse.data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[send-verification-email] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Failed to send verification email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
