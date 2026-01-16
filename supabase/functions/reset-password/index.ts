import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { hashToken } from "../_shared/token-hashing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Rate limiting constants
const MAX_RESET_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

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

    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `password_reset:${clientIp}`;

    // Check rate limit using correct column names from rate_limits table
    const { data: rateLimit } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('identifier', rateLimitKey)
      .maybeSingle();

    if (rateLimit) {
      // Check if blocked
      if (rateLimit.blocked_until && new Date(rateLimit.blocked_until) > new Date()) {
        const retryAfter = Math.ceil((new Date(rateLimit.blocked_until).getTime() - Date.now()) / 1000);
        console.log(`[reset-password] Rate limited IP: ${clientIp}`);
        return new Response(
          JSON.stringify({ error: "Too many reset attempts. Please try again later." }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "Retry-After": String(retryAfter)
            } 
          }
        );
      }

      // Check if window expired (using first_attempt_at as window start)
      const windowStart = new Date(rateLimit.first_attempt_at);
      const windowEnd = new Date(windowStart.getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
      
      if (new Date() > windowEnd) {
        // Reset window
        await supabaseAdmin
          .from('rate_limits')
          .update({
            attempt_count: 1,
            first_attempt_at: new Date().toISOString(),
            last_attempt_at: new Date().toISOString(),
            blocked_until: null
          })
          .eq('identifier', rateLimitKey);
      } else if (rateLimit.attempt_count >= MAX_RESET_ATTEMPTS) {
        // Block for the remainder of the window
        const blockedUntil = windowEnd.toISOString();
        await supabaseAdmin
          .from('rate_limits')
          .update({ blocked_until: blockedUntil })
          .eq('identifier', rateLimitKey);
        
        console.log(`[reset-password] Blocking IP ${clientIp} until ${blockedUntil}`);
        return new Response(
          JSON.stringify({ error: "Too many reset attempts. Please try again later." }),
          { 
            status: 429, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      } else {
        // Increment attempts
        await supabaseAdmin
          .from('rate_limits')
          .update({ 
            attempt_count: rateLimit.attempt_count + 1,
            last_attempt_at: new Date().toISOString()
          })
          .eq('identifier', rateLimitKey);
      }
    } else {
      // Create new rate limit record using correct column names
      await supabaseAdmin
        .from('rate_limits')
        .insert({
          identifier: rateLimitKey,
          action: 'password_reset',
          attempt_count: 1,
          first_attempt_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString()
        });
    }

    const body: ResetPasswordRequest = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Token and new password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the incoming token and query database
    const tokenHash = await hashToken(token);
    
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("*")
      .eq("token", tokenHash) // Query with hashed token
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.error("[reset-password] Token lookup error:", tokenError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired reset link. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the user's password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("[reset-password] Password update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update password. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark token as used
    await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    // Log the password reset
    await supabaseAdmin
      .from("audit_logs")
      .insert({
        user_id: tokenData.user_id,
        action: "password_reset_completed",
        metadata: { email: tokenData.email }
      });

    console.log(`[reset-password] Password reset completed for user ${tokenData.user_id} in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password has been reset successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[reset-password] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Failed to reset password" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
