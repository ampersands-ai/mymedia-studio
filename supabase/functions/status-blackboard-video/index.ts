import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[${requestId}] No authorization header`);
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
      console.error(`[${requestId}] Auth error:`, authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { storyboardId } = await req.json();

    if (!storyboardId) {
      return new Response(
        JSON.stringify({ error: "Storyboard ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch storyboard from database
    const { data: storyboard, error: storyboardError } = await supabase
      .from("blackboard_storyboards")
      .select("*")
      .eq("id", storyboardId)
      .eq("user_id", user.id)
      .single();

    if (storyboardError || !storyboard) {
      console.error(`[${requestId}] Storyboard fetch error:`, storyboardError?.message);
      return new Response(
        JSON.stringify({ error: "Storyboard not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If storyboard is already complete or failed, return current status
    if (storyboard.status === "complete" || storyboard.status === "failed") {
      return new Response(
        JSON.stringify({
          status: storyboard.status,
          finalVideoUrl: storyboard.final_video_url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no render ID yet, still queued/draft
    if (!storyboard.shotstack_render_id) {
      return new Response(
        JSON.stringify({ status: storyboard.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Poll Shotstack for status
    const shotstackApiKey = Deno.env.get("SHOTSTACK_API_KEY");
    if (!shotstackApiKey) {
      console.error(`[${requestId}] SHOTSTACK_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: "Render service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shotstackUrl = `https://api.shotstack.io/edit/v1/render/${storyboard.shotstack_render_id}`;
    
    console.log(`[${requestId}] Polling Shotstack for render ${storyboard.shotstack_render_id}`);

    const shotstackResponse = await fetch(shotstackUrl, {
      method: "GET",
      headers: {
        "x-api-key": shotstackApiKey,
      },
    });

    const shotstackData = await shotstackResponse.json();

    if (!shotstackResponse.ok) {
      console.error(`[${requestId}] Shotstack poll error:`, shotstackData);
      return new Response(
        JSON.stringify({ 
          status: storyboard.status,
          error: shotstackData.message || "Failed to poll status"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const renderStatus = shotstackData.response?.status;
    const renderUrl = shotstackData.response?.url;

    console.log(`[${requestId}] Shotstack status: ${renderStatus}, URL: ${renderUrl || 'none'}`);

    // Map Shotstack status to our status
    let newStatus = storyboard.status;
    let finalVideoUrl = null;

    switch (renderStatus) {
      case "queued":
      case "fetching":
      case "rendering":
      case "saving":
        newStatus = "rendering";
        break;
      case "done":
        newStatus = "complete";
        finalVideoUrl = renderUrl;
        break;
      case "failed":
        newStatus = "failed";
        break;
    }

    // Update storyboard if status changed
    if (newStatus !== storyboard.status || finalVideoUrl) {
      const updateData: Record<string, unknown> = { 
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      
      if (finalVideoUrl) {
        updateData.final_video_url = finalVideoUrl;
      }

      await supabase
        .from("blackboard_storyboards")
        .update(updateData)
        .eq("id", storyboardId);

      console.log(`[${requestId}] Updated storyboard ${storyboardId} to status: ${newStatus}`);

      // If failed, refund credits
      if (newStatus === "failed" && storyboard.estimated_render_cost) {
        console.log(`[${requestId}] Refunding ${storyboard.estimated_render_cost} credits to user ${user.id}`);
        await supabase.rpc("increment_tokens", {
          user_id_param: user.id,
          amount: storyboard.estimated_render_cost,
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        finalVideoUrl,
        shotstackStatus: renderStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
