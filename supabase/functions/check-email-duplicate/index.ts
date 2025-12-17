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
      console.error("[check-email-duplicate] Missing email in request");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const canonical = canonicalEmail || normalizeGmailDots(normalizedEmail);

    console.log("[check-email-duplicate] Checking email:", {
      inputEmail: normalizedEmail,
      canonicalForm: canonical,
      isGmail: normalizedEmail.endsWith('@gmail.com') || normalizedEmail.endsWith('@googlemail.com')
    });

    // Get all users and check for duplicates
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error("[check-email-duplicate] User lookup error:", userError);
      // Return false on error to not block signup
      return new Response(
        JSON.stringify({ isDuplicate: false, reason: "lookup_error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[check-email-duplicate] Total users in system:", userData.users.length);

    // Check if any existing user matches either:
    // 1. Exact email match
    // 2. Canonical email match (for Gmail accounts)
    let isDuplicate = false;
    let matchType = "";
    let matchedEmail = "";
    
    for (const u of userData.users) {
      if (!u.email) continue;
      const existingEmail = u.email.toLowerCase();
      const existingCanonical = normalizeGmailDots(existingEmail);
      
      // Exact match
      if (existingEmail === normalizedEmail) {
        isDuplicate = true;
        matchType = "exact";
        matchedEmail = existingEmail;
        console.log("[check-email-duplicate] Found EXACT match:", existingEmail);
        break;
      }
      
      // Canonical match (Gmail dot trick)
      if (existingCanonical === canonical) {
        isDuplicate = true;
        matchType = "canonical_gmail";
        matchedEmail = existingEmail;
        console.log("[check-email-duplicate] Found CANONICAL match:", {
          existingEmail,
          existingCanonical,
          inputCanonical: canonical
        });
        break;
      }
      
      // Also check stored canonical_email in user metadata
      const storedCanonical = u.user_metadata?.canonical_email;
      if (storedCanonical && storedCanonical === canonical) {
        isDuplicate = true;
        matchType = "metadata_canonical";
        matchedEmail = existingEmail;
        console.log("[check-email-duplicate] Found METADATA CANONICAL match:", {
          existingEmail,
          storedCanonical,
          inputCanonical: canonical
        });
        break;
      }
    }

    console.log("[check-email-duplicate] Result:", {
      inputEmail: normalizedEmail,
      isDuplicate,
      matchedEmail: matchedEmail || "none",
      matchType: matchType || "none"
    });

    return new Response(
      JSON.stringify({ 
        isDuplicate,
        ...(isDuplicate ? { matchType } : {})
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[check-email-duplicate] Unexpected error:", errorMessage);
    // Return false on error to not block signup
    return new Response(
      JSON.stringify({ isDuplicate: false, reason: "unexpected_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
