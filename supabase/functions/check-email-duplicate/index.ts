import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { normalizeGmailDots } from "../_shared/email-validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckEmailRequest {
  email: string;
  canonicalEmail?: string;
}

/**
 * Check if an email address (or its Gmail canonical form) already exists
 * This prevents users from creating duplicate accounts using Gmail's dot-ignoring feature
 * e.g., john.doe@gmail.com and johndoe@gmail.com are the same mailbox
 */
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: CheckEmailRequest = await req.json();
    const { email, canonicalEmail } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const canonical = canonicalEmail || normalizeGmailDots(normalizedEmail);

    // Get all users and check for duplicates
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error("[check-email-duplicate] User lookup error:", userError);
      // Return false on error to not block signup
      return new Response(
        JSON.stringify({ isDuplicate: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if any existing user matches either:
    // 1. Exact email match
    // 2. Canonical email match (for Gmail accounts)
    const isDuplicate = userData.users.some(u => {
      if (!u.email) return false;
      const existingEmail = u.email.toLowerCase();
      const existingCanonical = normalizeGmailDots(existingEmail);
      
      // Exact match
      if (existingEmail === normalizedEmail) return true;
      
      // Canonical match (Gmail dot trick)
      if (existingCanonical === canonical) return true;
      
      // Also check stored canonical_email in user metadata
      const storedCanonical = u.user_metadata?.canonical_email;
      if (storedCanonical && storedCanonical === canonical) return true;
      
      return false;
    });

    return new Response(
      JSON.stringify({ isDuplicate }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[check-email-duplicate] Error:", errorMessage);
    // Return false on error to not block signup
    return new Response(
      JSON.stringify({ isDuplicate: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
