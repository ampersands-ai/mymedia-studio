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
 * Uses indexed queries on profiles table for O(1) performance
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
    const isGmail = normalizedEmail.endsWith('@gmail.com') || normalizedEmail.endsWith('@googlemail.com');
    const canonical = canonicalEmail || normalizeGmailDots(normalizedEmail);

    console.log("[check-email-duplicate] Checking:", { 
      normalizedEmail, 
      isGmail,
      canonical: isGmail ? canonical : 'N/A'
    });

    // Efficient indexed query on profiles table for exact email match
    const { data: exactMatch, error: exactError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .limit(1);

    if (exactError) {
      console.error("[check-email-duplicate] Exact match query error:", exactError);
      // Return false on error to not block signup
      return new Response(
        JSON.stringify({ isDuplicate: false, reason: "lookup_error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (exactMatch && exactMatch.length > 0) {
      console.log("[check-email-duplicate] Found EXACT match in profiles");
      return new Response(
        JSON.stringify({ isDuplicate: true, matchType: "exact" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For Gmail addresses, check canonical form (without dots)
    // This prevents users from creating duplicate accounts using Gmail's dot-ignoring feature
    if (isGmail) {
      // Query only Gmail users from profiles for canonical comparison
      const { data: gmailProfiles, error: gmailError } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .or('email.ilike.%@gmail.com,email.ilike.%@googlemail.com');

      if (gmailError) {
        console.error("[check-email-duplicate] Gmail query error:", gmailError);
        // Return false on error to not block signup
        return new Response(
          JSON.stringify({ isDuplicate: false, reason: "gmail_lookup_error" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (gmailProfiles) {
        for (const profile of gmailProfiles) {
          if (!profile.email) continue;
          const existingCanonical = normalizeGmailDots(profile.email.toLowerCase());
          
          if (existingCanonical === canonical) {
            console.log("[check-email-duplicate] Found CANONICAL Gmail match:", {
              existingEmail: profile.email,
              existingCanonical,
              inputCanonical: canonical
            });
            return new Response(
              JSON.stringify({ isDuplicate: true, matchType: "canonical_gmail" }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    console.log("[check-email-duplicate] No duplicate found for:", normalizedEmail);
    return new Response(
      JSON.stringify({ isDuplicate: false }),
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
