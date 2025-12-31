import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * SHA-256 hash function for sensitive data
 */
async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Anonymize IP address by zeroing last octet for IPv4, hashing for IPv6
 */
async function anonymizeIp(ip: string): Promise<string> {
  if (!ip) return "";
  
  // IPv6 - hash the whole thing
  if (ip.includes(":")) {
    return await hashData(ip);
  }
  
  // IPv4 - zero last octet, then hash
  const parts = ip.split(".");
  if (parts.length === 4) {
    parts[3] = "0";
    return await hashData(parts.join("."));
  }
  
  return await hashData(ip);
}

/**
 * Get client IP from request headers
 */
function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    ""
  );
}

interface ConsentRecord {
  consent_type: string;
  consented: boolean;
}

interface ManageConsentRequest {
  action: "save" | "migrate" | "get_history";
  device_id: string;
  consents?: ConsentRecord[];
  user_agent?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header (optional - consent can be saved anonymously)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id || null;
    }

    const body: ManageConsentRequest = await req.json();
    const { action, device_id, consents, user_agent } = body;

    if (!device_id) {
      return new Response(
        JSON.stringify({ error: "device_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash all sensitive data
    const deviceIdHash = await hashData(device_id);
    const clientIp = getClientIp(req);
    const ipHash = clientIp ? await anonymizeIp(clientIp) : null;
    const userAgentHash = user_agent ? await hashData(user_agent) : null;

    switch (action) {
      case "save": {
        if (!consents || !Array.isArray(consents)) {
          return new Response(
            JSON.stringify({ error: "consents array is required for save action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const results = [];

        for (const consent of consents) {
          const { consent_type, consented } = consent;

          // Check for existing consent record
          const { data: existingRecord } = await supabaseAdmin
            .from("user_consent_records")
            .select("id, consented")
            .eq("device_id_hash", deviceIdHash)
            .eq("consent_type", consent_type)
            .maybeSingle();

          const previousState = existingRecord?.consented ?? null;
          const now = new Date().toISOString();

          if (existingRecord) {
            // Update existing record
            const { error: updateError } = await supabaseAdmin
              .from("user_consent_records")
              .update({
                user_id: userId,
                consented,
                consented_at: consented ? now : existingRecord.consented ? null : now,
                withdrawn_at: !consented ? now : null,
                ip_hash: ipHash,
                user_agent_hash: userAgentHash,
              })
              .eq("id", existingRecord.id);

            if (updateError) {
              console.error("Failed to update consent:", updateError);
              results.push({ consent_type, success: false, error: updateError.message });
              continue;
            }
          } else {
            // Insert new record
            const { error: insertError } = await supabaseAdmin
              .from("user_consent_records")
              .insert({
                user_id: userId,
                device_id_hash: deviceIdHash,
                consent_type,
                consented,
                consented_at: consented ? now : null,
                withdrawn_at: !consented ? now : null,
                ip_hash: ipHash,
                user_agent_hash: userAgentHash,
              });

            if (insertError) {
              console.error("Failed to insert consent:", insertError);
              results.push({ consent_type, success: false, error: insertError.message });
              continue;
            }
          }

          // Create audit log entry
          const auditAction = previousState === null 
            ? "granted" 
            : consented ? "granted" : "withdrawn";

          const { error: auditError } = await supabaseAdmin
            .from("consent_audit_log")
            .insert({
              user_id: userId,
              device_id_hash: deviceIdHash,
              consent_type,
              action: auditAction,
              previous_state: previousState,
              new_state: consented,
              ip_hash: ipHash,
              user_agent_hash: userAgentHash,
            });

          if (auditError) {
            console.warn("Failed to create audit log:", auditError);
          }

          results.push({ consent_type, success: true });
        }

        return new Response(
          JSON.stringify({ success: true, results }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "migrate": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Authentication required for migration" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Call the database function to migrate anonymous consent
        const { data, error } = await supabaseAdmin.rpc("migrate_anonymous_consent", {
          p_user_id: userId,
          p_device_id_hash: deviceIdHash,
        });

        if (error) {
          console.error("Migration failed:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Migrated ${data} consent records for user ${userId}`);

        return new Response(
          JSON.stringify({ success: true, migrated_count: data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_history": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Authentication required to view history" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get user's consent audit history
        const { data: auditHistory, error } = await supabaseAdmin
          .from("consent_audit_log")
          .select("consent_type, action, previous_state, new_state, recorded_at")
          .eq("user_id", userId)
          .order("recorded_at", { ascending: false })
          .limit(100);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current consent status
        const { data: currentConsent } = await supabaseAdmin
          .from("user_consent_records")
          .select("consent_type, consented, consented_at, withdrawn_at")
          .eq("user_id", userId);

        return new Response(
          JSON.stringify({ 
            success: true, 
            current: currentConsent || [],
            history: auditHistory || [] 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Consent management error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
