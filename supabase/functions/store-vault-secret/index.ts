import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface StoreSecretRequest {
  secret_value: string;
  secret_name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: StoreSecretRequest = await req.json();
    const { secret_value, secret_name } = body;

    // Validate inputs
    if (!secret_value || !secret_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: secret_value and secret_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (secret_name !== "supabase_anon_key") {
      return new Response(
        JSON.stringify({ error: "Only 'supabase_anon_key' is allowed for security reasons" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate anon key format (JWT format check)
    if (!secret_value.startsWith("eyJ")) {
      return new Response(
        JSON.stringify({ error: "Invalid anon key format - must be a valid JWT token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Installing vault extension if needed...");
    
    // Install vault extension (idempotent operation)
    const { error: extensionError } = await supabase.rpc("exec_sql", {
      sql: "CREATE EXTENSION IF NOT EXISTS supabase_vault;"
    }).catch(() => {
      // If exec_sql doesn't exist, try direct SQL
      return supabase.from("_migrations").select("*").limit(1); // Dummy query to check connection
    });

    // Store secret in vault
    console.log("Storing secret in vault...");
    
    const { data: vaultData, error: vaultError } = await supabase.rpc(
      "vault_create_secret",
      {
        secret: secret_value,
        name: secret_name
      }
    ).catch(async () => {
      // Fallback: Try using the vault schema directly
      const { data, error } = await supabase
        .schema("vault")
        .from("secrets")
        .insert({
          name: secret_name,
          secret: secret_value
        })
        .select()
        .single();
      
      return { data, error };
    });

    if (vaultError) {
      console.error("Vault error:", vaultError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to store secret in vault",
          details: vaultError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log audit trail
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "vault_secret_stored",
      metadata: {
        secret_name,
        stored_at: new Date().toISOString(),
        stored_by: user.email
      }
    });

    console.log("Secret stored successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Secret stored successfully in encrypted vault",
        secret_name,
        stored_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error storing vault secret:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
