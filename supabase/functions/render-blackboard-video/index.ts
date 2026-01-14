import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map storyboard aspect ratios to Shotstack-supported values
// Shotstack supports: 16:9, 9:16, 1:1, 4:5, 4:3
function mapAspectRatio(storyboardAspectRatio: string | null): string | null {
  const mapping: Record<string, string> = {
    // Standard ratios (direct match)
    "16:9": "16:9",
    "9:16": "9:16",
    "1:1": "1:1",
    "4:5": "4:5",
    "4:3": "4:3",
    // YouTube format
    "youtube": "16:9",
    "youtube-shorts": "9:16",
    // TikTok format
    "tiktok": "9:16",
    // Instagram formats
    "instagram-feed": "1:1",
    "instagram-story": "9:16",
    "instagram-reels": "9:16",
    // Twitter/X formats
    "twitter": "16:9",
    // Facebook formats
    "facebook": "16:9",
    "facebook-story": "9:16",
    // LinkedIn
    "linkedin": "16:9",
    // Widescreen/cinematic
    "widescreen": "16:9",
    "cinematic": "16:9",
    // Portrait
    "portrait": "9:16",
    // Square
    "square": "1:1",
  };

  if (!storyboardAspectRatio) return null;
  
  const normalized = storyboardAspectRatio.toLowerCase().trim();
  return mapping[normalized] || null;
}

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

    console.log(`[${requestId}] User ${user.id} starting blackboard render via Shotstack`);

    // Parse request body
    const { storyboardId } = await req.json();

    if (!storyboardId) {
      return new Response(
        JSON.stringify({ error: "Missing storyboardId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the blackboard storyboard
    const { data: storyboard, error: storyboardError } = await supabase
      .from("blackboard_storyboards")
      .select("*")
      .eq("id", storyboardId)
      .eq("user_id", user.id)
      .single();

    if (storyboardError || !storyboard) {
      console.error(`[${requestId}] Storyboard fetch error:`, storyboardError?.message);
      return new Response(
        JSON.stringify({ error: "Storyboard not found or unauthorized" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch scenes with video URLs
    const { data: scenes, error: scenesError } = await supabase
      .from("blackboard_scenes")
      .select("id, order_number, generated_video_url, video_generation_status")
      .eq("storyboard_id", storyboardId)
      .order("order_number", { ascending: true });

    if (scenesError || !scenes) {
      console.error(`[${requestId}] Scenes fetch error:`, scenesError?.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch scenes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to only completed scenes with video URLs
    const videosToStitch = scenes.filter(
      (s) => s.video_generation_status === "complete" && s.generated_video_url
    );

    if (videosToStitch.length === 0) {
      return new Response(
        JSON.stringify({ error: "No completed videos to stitch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Found ${videosToStitch.length} videos to stitch`);

    // Calculate cost: 1 credit per 5 seconds, assume each clip is ~5 seconds
    const estimatedCredits = Math.ceil(videosToStitch.length * 1);

    // Check user credits
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("tokens_remaining")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      console.error(`[${requestId}] Subscription fetch error:`, subError?.message);
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
          available: subscription.tokens_remaining,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct credits
    const { error: deductError } = await supabase.rpc("increment_tokens", {
      user_id_param: user.id,
      amount: -estimatedCredits,
    });

    if (deductError) {
      console.error(`[${requestId}] Credit deduction error:`, deductError.message);
      return new Response(
        JSON.stringify({ error: "Failed to deduct credits" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Deducted ${estimatedCredits} credits`);

    // Get Shotstack API key
    const shotstackApiKey = Deno.env.get("SHOTSTACK_API_KEY");
    if (!shotstackApiKey) {
      console.error(`[${requestId}] SHOTSTACK_API_KEY not configured`);
      // Refund credits
      await supabase.rpc("increment_tokens", {
        user_id_param: user.id,
        amount: estimatedCredits,
      });
      await supabase
        .from("blackboard_storyboards")
        .update({ status: "failed" })
        .eq("id", storyboardId);
      return new Response(
        JSON.stringify({ error: "Render service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map aspect ratio to Shotstack-supported value
    const mappedAspectRatio = mapAspectRatio(storyboard.aspect_ratio);
    console.log(`[${requestId}] Storyboard aspect ratio: ${storyboard.aspect_ratio} -> Shotstack: ${mappedAspectRatio || 'default (no override)'}`);

    // Build Shotstack timeline - concatenate all video clips sequentially
    const CLIP_DURATION = 5; // Each video clip is assumed to be 5 seconds
    let currentStart = 0;
    
    const clips = videosToStitch.map((scene) => {
      const clip = {
        asset: {
          type: "video",
          src: scene.generated_video_url,
        },
        start: currentStart,
        length: CLIP_DURATION,
        fit: "cover",
      };
      currentStart += CLIP_DURATION;
      return clip;
    });

    // Build Shotstack payload with resolution (required by Shotstack API)
    // Resolution presets based on aspect ratio
    const resolutionMap: Record<string, string> = {
      "16:9": "hd",      // 1920x1080
      "9:16": "mobile",  // 1080x1920
      "1:1": "sd",       // 1024x1024 (Shotstack uses 1024 for square)
      "4:5": "sd",       // Will be cropped to 4:5
      "4:3": "sd",       // Will be cropped to 4:3
    };

    const shotstackOutput: Record<string, string> = {
      format: "mp4",
      resolution: resolutionMap[mappedAspectRatio || "16:9"] || "hd",
    };
    
    if (mappedAspectRatio) {
      shotstackOutput.aspectRatio = mappedAspectRatio;
    }

    const shotstackPayload = {
      timeline: {
        tracks: [
          {
            clips: clips,
          },
        ],
        background: "#000000",
      },
      output: shotstackOutput,
    };

    console.log(`[${requestId}] Submitting to Shotstack:`, JSON.stringify(shotstackPayload, null, 2));

    const shotstackUrl = "https://api.shotstack.io/edit/v1/render";
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
      console.error(`[${requestId}] Shotstack error:`, shotstackData);
      // Refund credits
      await supabase.rpc("increment_tokens", {
        user_id_param: user.id,
        amount: estimatedCredits,
      });
      await supabase
        .from("blackboard_storyboards")
        .update({ status: "failed" })
        .eq("id", storyboardId);
      return new Response(
        JSON.stringify({ error: shotstackData.message || "Render failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const renderId = shotstackData.response?.id;
    console.log(`[${requestId}] Shotstack render ID: ${renderId}`);

    // Update storyboard with render ID and estimated cost
    await supabase
      .from("blackboard_storyboards")
      .update({ 
        status: "rendering",
        shotstack_render_id: renderId,
        estimated_render_cost: estimatedCredits,
      })
      .eq("id", storyboardId);

    return new Response(
      JSON.stringify({
        success: true,
        storyboardId,
        renderId,
        estimatedCredits,
        videosCount: videosToStitch.length,
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
