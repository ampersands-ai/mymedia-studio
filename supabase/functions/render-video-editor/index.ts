import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RenderRequest {
  clips: Array<{
    id: string;
    assetId: string;
    duration: number;
    trimStart: number;
    transitionIn?: string;
    transitionOut?: string;
    transitionDuration: number;
    volume: number;
    fit: string;
  }>;
  audioTrack: {
    id: string;
    assetId: string;
    volume: number;
    fadeIn: boolean;
    fadeOut: boolean;
  } | null;
  subtitleConfig: {
    mode: string;
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    showBackground: boolean;
    position: string;
  };
  outputSettings: {
    aspectRatio: string;
    format: string;
    backgroundColor: string;
    fps: number;
    quality: string;
  };
  totalDuration: number;
  estimatedCredits: number;
  shotstackPayload: any;
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
      console.error("[render-video-editor] No authorization header");
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
      console.error("[render-video-editor] Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[render-video-editor] User ${user.id} starting render`);

    // Parse request body
    const body: RenderRequest = await req.json();
    const { clips, audioTrack, subtitleConfig, outputSettings, totalDuration, estimatedCredits, shotstackPayload } = body;

    // Validate request
    if (!clips || clips.length === 0) {
      return new Response(
        JSON.stringify({ error: "No clips provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (totalDuration <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid duration" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate estimatedCredits
    if (typeof estimatedCredits !== 'number' || estimatedCredits <= 0) {
      console.error("[render-video-editor] Invalid estimatedCredits:", estimatedCredits);
      return new Response(
        JSON.stringify({ error: "Invalid credit amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user credits
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("tokens_remaining")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      console.error("[render-video-editor] Subscription fetch error:", subError?.message);
      return new Response(
        JSON.stringify({ error: "Could not verify credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (subscription.tokens_remaining < estimatedCredits) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient credits",
          required: estimatedCredits,
          available: subscription.tokens_remaining
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct credits - ensure cost is a valid number for the numeric type
    const creditCost = Number(estimatedCredits);
    console.log(`[render-video-editor] Deducting credits: user=${user.id}, cost=${creditCost}`);
    
    const { error: deductError } = await supabase.rpc("deduct_user_tokens", {
      p_user_id: user.id,
      p_cost: creditCost,
    });

    if (deductError) {
      console.error("[render-video-editor] Credit deduction error:", deductError.message);
      return new Response(
        JSON.stringify({ error: "Failed to deduct credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[render-video-editor] Deducted ${estimatedCredits} credits from user ${user.id}`);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from("video_editor_jobs")
      .insert({
        user_id: user.id,
        status: "queued",
        clips: clips,
        audio_track: audioTrack,
        subtitle_config: subtitleConfig,
        output_settings: outputSettings,
        total_duration: totalDuration,
        cost_credits: estimatedCredits,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error("[render-video-editor] Job creation error:", jobError?.message);
      // Refund credits on failure
      await supabase.rpc("increment_tokens", {
        user_id_param: user.id,
        amount: estimatedCredits,
      });
      return new Response(
        JSON.stringify({ error: "Failed to create job" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[render-video-editor] Created job ${job.id}`);

    // Submit to Shotstack API
    const shotstackApiKey = Deno.env.get("SHOTSTACK_API_KEY");
    if (!shotstackApiKey) {
      console.error("[render-video-editor] SHOTSTACK_API_KEY not configured");
      await supabase
        .from("video_editor_jobs")
        .update({ status: "failed", error_message: "Render service not configured" })
        .eq("id", job.id);
      // Refund credits
      await supabase.rpc("increment_tokens", {
        user_id_param: user.id,
        amount: estimatedCredits,
      });
      return new Response(
        JSON.stringify({ error: "Render service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shotstackUrl = "https://api.shotstack.io/edit/v1/render";
    
    console.log(`[render-video-editor] Submitting to Shotstack:`, JSON.stringify(shotstackPayload, null, 2));

    const shotstackResponse = await fetch(shotstackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": shotstackApiKey,
      },
      body: JSON.stringify(shotstackPayload),
    });

    const shotstackData = await shotstackResponse.json();

    if (!shotstackResponse.ok) {
      console.error("[render-video-editor] Shotstack error:", shotstackData);
      await supabase
        .from("video_editor_jobs")
        .update({ 
          status: "failed", 
          error_message: shotstackData.message || "Shotstack API error" 
        })
        .eq("id", job.id);
      // Refund credits
      await supabase.rpc("increment_tokens", {
        user_id_param: user.id,
        amount: estimatedCredits,
      });
      return new Response(
        JSON.stringify({ error: shotstackData.message || "Render failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const renderId = shotstackData.response?.id;
    console.log(`[render-video-editor] Shotstack render ID: ${renderId}`);

    // Update job with render ID
    await supabase
      .from("video_editor_jobs")
      .update({ 
        status: "rendering",
        shotstack_render_id: renderId,
      })
      .eq("id", job.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId: job.id,
        renderId,
        estimatedCredits,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[render-video-editor] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
