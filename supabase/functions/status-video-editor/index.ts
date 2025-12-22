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

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[status-video-editor] No authorization header");
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
      console.error("[status-video-editor] Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "Job ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch job from database
    const { data: job, error: jobError } = await supabase
      .from("video_editor_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();

    if (jobError || !job) {
      console.error("[status-video-editor] Job fetch error:", jobError?.message);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If job is already complete or failed, return current status
    if (job.status === "done" || job.status === "failed") {
      return new Response(
        JSON.stringify({
          status: job.status,
          finalVideoUrl: job.final_video_url,
          errorMessage: job.error_message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no render ID yet, still queued
    if (!job.shotstack_render_id) {
      return new Response(
        JSON.stringify({ status: job.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Poll Shotstack for status
    const shotstackApiKey = Deno.env.get("SHOTSTACK_API_KEY");
    if (!shotstackApiKey) {
      console.error("[status-video-editor] SHOTSTACK_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Render service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shotstackUrl = `https://api.shotstack.io/edit/v1/render/${job.shotstack_render_id}`;
    
    console.log(`[status-video-editor] Polling Shotstack for render ${job.shotstack_render_id}`);

    const shotstackResponse = await fetch(shotstackUrl, {
      method: "GET",
      headers: {
        "x-api-key": shotstackApiKey,
      },
    });

    const shotstackData = await shotstackResponse.json();

    if (!shotstackResponse.ok) {
      console.error("[status-video-editor] Shotstack poll error:", shotstackData);
      return new Response(
        JSON.stringify({ 
          status: job.status,
          error: shotstackData.message || "Failed to poll status"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const renderStatus = shotstackData.response?.status;
    const renderUrl = shotstackData.response?.url;

    console.log(`[status-video-editor] Shotstack status: ${renderStatus}`);

    // Map Shotstack status to our status
    let newStatus = job.status;
    let finalVideoUrl = null;
    let errorMessage = null;

    switch (renderStatus) {
      case "queued":
        newStatus = "queued";
        break;
      case "fetching":
        newStatus = "fetching";
        break;
      case "rendering":
        newStatus = "rendering";
        break;
      case "saving":
        newStatus = "saving";
        break;
      case "done":
        newStatus = "done";
        finalVideoUrl = renderUrl;
        break;
      case "failed":
        newStatus = "failed";
        errorMessage = shotstackData.response?.error || "Render failed";
        break;
    }

    // Update job if status changed
    if (newStatus !== job.status || finalVideoUrl || errorMessage) {
      const updateData: any = { status: newStatus };
      if (finalVideoUrl) updateData.final_video_url = finalVideoUrl;
      if (errorMessage) updateData.error_message = errorMessage;

      await supabase
        .from("video_editor_jobs")
        .update(updateData)
        .eq("id", jobId);

      console.log(`[status-video-editor] Updated job ${jobId} to status: ${newStatus}`);
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        finalVideoUrl,
        errorMessage,
        shotstackStatus: renderStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[status-video-editor] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
