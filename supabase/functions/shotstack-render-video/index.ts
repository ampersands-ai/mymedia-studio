import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Scene {
  id: string;
  sceneNumber: number;
  voiceoverText: string;
  imageUrl: string;
}

interface RenderRequest {
  scenes: Scene[];
  aspectRatio: '16:9' | '9:16' | '4:5' | '1:1';
  backgroundColor?: string;
}

const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '4:5': { width: 1080, height: 1350 },
  '1:1': { width: 1080, height: 1080 },
};

const SCENE_DURATION = 5; // seconds per scene

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const body: RenderRequest = await req.json();
    const { scenes, aspectRatio, backgroundColor = '#000000' } = body;

    if (!scenes || scenes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No scenes provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate all scenes have images
    const missingImages = scenes.filter(s => !s.imageUrl);
    if (missingImages.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing images for scenes: ${missingImages.map(s => s.sceneNumber).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[shotstack-render-video] Building timeline for ${scenes.length} scenes`);

    // Get Shotstack API key
    const shotstackApiKey = Deno.env.get("SHOTSTACK_API_KEY");
    if (!shotstackApiKey) {
      return new Response(
        JSON.stringify({ error: "SHOTSTACK_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { width, height } = ASPECT_DIMENSIONS[aspectRatio] || ASPECT_DIMENSIONS['16:9'];

    // Build Shotstack timeline
    // Track 1: Text overlays (on top)
    const textClips = scenes.map((scene, index) => ({
      asset: {
        type: "title",
        text: scene.voiceoverText,
        style: "subtitle",
        color: "#ffffff",
        size: "small",
        background: "#00000080", // Semi-transparent black background
        position: "bottom",
      },
      start: index * SCENE_DURATION,
      length: SCENE_DURATION,
      transition: {
        in: "fade",
        out: "fade",
      },
    }));

    // Track 2: Images with Ken Burns effect
    const imageClips = scenes.map((scene, index) => ({
      asset: {
        type: "image",
        src: scene.imageUrl,
      },
      start: index * SCENE_DURATION,
      length: SCENE_DURATION,
      fit: "cover",
      effect: index % 2 === 0 ? "zoomIn" : "zoomOut", // Alternate zoom effects
      transition: {
        in: "fade",
        out: "fade",
      },
    }));

    const timeline = {
      background: backgroundColor,
      tracks: [
        { clips: textClips },   // Text on top
        { clips: imageClips },  // Images below
      ],
    };

    const payload = {
      timeline,
      output: {
        format: "mp4",
        resolution: "hd",
        size: { width, height },
      },
    };

    console.log(`[shotstack-render-video] Submitting to Shotstack:`, JSON.stringify(payload, null, 2));

    // Submit to Shotstack (production endpoint)
    const shotstackUrl = `${API_ENDPOINTS.SHOTSTACK.BASE}/edit${API_ENDPOINTS.SHOTSTACK.VERSION}${API_ENDPOINTS.SHOTSTACK.RENDER}`;

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
      console.error("[shotstack-render-video] Shotstack error:", shotstackData);
      return new Response(
        JSON.stringify({ 
          error: shotstackData.message || "Shotstack API error",
          details: shotstackData 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const renderId = shotstackData.response?.id;
    console.log(`[shotstack-render-video] Render submitted. ID: ${renderId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        renderId,
        message: "Video render submitted to Shotstack",
        totalDuration: scenes.length * SCENE_DURATION
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[shotstack-render-video] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
