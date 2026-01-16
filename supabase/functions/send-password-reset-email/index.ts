import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { normalizeGmailDots } from "../_shared/email-validation.ts";
import { hashToken } from "../_shared/token-hashing.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: PasswordResetRequest = await req.json();
    const { email } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const canonicalEmail = normalizeGmailDots(normalizedEmail);

    // Find user by email using admin API
    // For Gmail addresses, also check canonical form (without dots)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error("[send-password-reset-email] User lookup error:", userError);
      // Return success even on error to prevent email enumeration
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a password reset email has been sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Match by exact email OR canonical Gmail form
    const user = userData.users.find(u => {
      if (!u.email) return false;
      const userEmail = u.email.toLowerCase();
      const userCanonical = normalizeGmailDots(userEmail);
      return userEmail === normalizedEmail || userCanonical === canonicalEmail;
    });
    
    if (!user) {
      // Return success to prevent email enumeration
      console.log(`[send-password-reset-email] No user found for email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a password reset email has been sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: Check for recent reset emails (1 per 60 seconds)
    const { data: recentTokens } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (recentTokens && recentTokens.length > 0) {
      const lastSentAt = new Date(recentTokens[0].created_at);
      const secondsRemaining = Math.ceil(60 - (Date.now() - lastSentAt.getTime()) / 1000);
      return new Response(
        JSON.stringify({ 
          error: "Rate limited", 
          message: `Please wait ${secondsRemaining} seconds before requesting another reset email`,
          retryAfter: secondsRemaining
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure token and hash for storage
    const token = crypto.randomUUID();
    const tokenHash = await hashToken(token);

    // Store hashed token in database (plaintext never stored)
    const { error: insertError } = await supabaseAdmin
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        token: tokenHash, // Store SHA-256 hash, not plaintext
        email: normalizedEmail,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });

    if (insertError) {
      console.error("[send-password-reset-email] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create reset token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build reset URL
    const appUrl = Deno.env.get("APP_URL") || "https://artifio.ai";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const fullName = user.user_metadata?.full_name || "";

    // Send branded password reset email
    const emailResponse = await resend.emails.send({
      from: "Artifio <noreply@artifio.ai>",
      to: [normalizedEmail],
      subject: "Reset your password - Artifio",
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
                        Reset your password
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding-bottom: 30px;">
                      <p style="margin: 0; font-size: 16px; line-height: 24px; color: #a0a0a0;">
                        ${fullName ? `Hi ${fullName.split(' ')[0]},` : 'Hi there,'}<br><br>
                        We received a request to reset your password. Click the button below to create a new password.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding-bottom: 30px;">
                      <a href="${resetUrl}" 
                         style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 12px;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding-bottom: 20px;">
                      <p style="margin: 0; font-size: 14px; color: #666666;">
                        This link will expire in 1 hour.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="text-align: center; padding-bottom: 20px;">
                      <p style="margin: 0; font-size: 13px; color: #555555;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${resetUrl}" style="color: #f97316; word-break: break-all;">${resetUrl}</a>
                      </p>
                    </td>
                  </tr>
                </table>
                
                <!-- Footer -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="text-align: center; padding-top: 30px; border-top: 1px solid #2a2a2a;">
                      <p style="margin: 0; font-size: 12px; color: #555555;">
                        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 12px; color: #555555;">
                        © ${new Date().getFullYear()} Artifio. All rights reserved.
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 11px; color: #444444;">
                        This is an automated message. Please do not reply to this email.<br>
                        For assistance, contact <a href="mailto:support@artifio.ai" style="color: #f97316;">support@artifio.ai</a>
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

    console.log(`[send-password-reset-email] Email sent to ${normalizedEmail} in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "If an account exists, a password reset email has been sent",
        emailId: emailResponse.data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[send-password-reset-email] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Failed to send password reset email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
