import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyEmailRequest {
  token: string;
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

    const body: VerifyEmailRequest = await req.json();
    const { token } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing verification token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the verification token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("email_verification_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("[verify-email] Token not found:", tokenError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification link" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log(`[verify-email] Token expired for user ${tokenData.user_id}`);
      return new Response(
        JSON.stringify({ error: "Verification link has expired. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token was already used
    if (tokenData.used_at) {
      console.log(`[verify-email] Token already used for user ${tokenData.user_id}`);
      return new Response(
        JSON.stringify({ error: "This verification link has already been used." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark token as used
    const { error: updateTokenError } = await supabaseAdmin
      .from("email_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    if (updateTokenError) {
      console.error("[verify-email] Failed to mark token as used:", updateTokenError);
    }

    // Update the user's email_verified status in profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", tokenData.user_id);

    if (profileError) {
      console.error("[verify-email] Failed to update profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to verify email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update auth.users email_confirmed_at via admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (authError) {
      console.error("[verify-email] Failed to update auth user:", authError);
      // Don't fail - profile is already updated
    }

    // Log the verification
    try {
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          user_id: tokenData.user_id,
          action: "email_verified",
          resource_type: "profile",
          resource_id: tokenData.user_id,
          metadata: { email: tokenData.email }
        });
    } catch (logError) {
      console.error("[verify-email] Failed to log verification:", logError);
    }

    console.log(`[verify-email] Email verified for user ${tokenData.user_id} in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email verified successfully",
        email: tokenData.email
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[verify-email] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Failed to verify email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
