import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("is_admin_user", { check_user_id: user.id });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, months_to_keep } = await req.json();

    let result;

    switch (action) {
      case "run_archival":
        // Run the scheduled archival
        const { data: archivalResult, error: archivalError } = await supabase.rpc(
          "run_scheduled_archival" as never
        );
        if (archivalError) throw archivalError;
        result = { success: true, data: archivalResult };
        break;

      case "create_partitions":
        // Create monthly partitions
        const { data: partitionResult, error: partitionError } = await supabase.rpc(
          "create_monthly_partitions" as never
        );
        if (partitionError) throw partitionError;
        result = { success: true, data: partitionResult };
        break;

      case "drop_old_partitions":
        // Drop old partitions
        const { data: dropResult, error: dropError } = await supabase.rpc(
          "drop_old_partitions" as never,
          { months_to_keep: months_to_keep || 12 }
        );
        if (dropError) throw dropError;
        result = { success: true, data: dropResult };
        break;

      case "get_history":
        // Get archival history
        const { data: historyData, error: historyError } = await supabase
          .from("archival_runs" as never)
          .select("*")
          .order("run_at", { ascending: false })
          .limit(20);
        if (historyError) throw historyError;
        result = { success: true, data: historyData };
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin archival error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
