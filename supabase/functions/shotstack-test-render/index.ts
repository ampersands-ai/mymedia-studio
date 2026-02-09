import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RenderRequest {
  payload: {
    timeline: any;
    output: any;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[shotstack-test-render] No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[shotstack-test-render] Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[shotstack-test-render] User ${user.id} submitting test render`);

    // Parse request body
    const body: RenderRequest = await req.json();
    const { payload } = body;

    if (!payload || !payload.timeline || !payload.output) {
      return new Response(
        JSON.stringify({ error: "Invalid payload - missing timeline or output" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Shotstack API key
    const shotstackApiKey = Deno.env.get("SHOTSTACK_API_KEY");
    if (!shotstackApiKey) {
      console.error("[shotstack-test-render] SHOTSTACK_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Shotstack API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use production endpoint from API_ENDPOINTS
    const shotstackUrl = `${API_ENDPOINTS.SHOTSTACK.BASE}/edit${API_ENDPOINTS.SHOTSTACK.VERSION}${API_ENDPOINTS.SHOTSTACK.RENDER}`;
    
    console.log(`[shotstack-test-render] Submitting to Shotstack:`, shotstackUrl);
    console.log(`[shotstack-test-render] Payload:`, JSON.stringify(payload, null, 2));

    const shotstackResponse = await fetch(shotstackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": shotstackApiKey,
      },
      body: JSON.stringify(payload),
    });

    const shotstackData = await shotstackResponse.json();

    if (!shotstackResponse.ok) {
      console.error("[shotstack-test-render] Shotstack error:", shotstackData);
      return new Response(
        JSON.stringify({ 
          error: shotstackData.message || "Shotstack API error",
          details: shotstackData 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const renderId = shotstackData.response?.id;
    console.log(`[shotstack-test-render] Render ID: ${renderId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        renderId,
        message: "Render submitted to Shotstack"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[shotstack-test-render] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
