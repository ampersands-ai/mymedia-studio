import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StoryboardRequest {
  topic: string;
  duration: number; // in seconds
  style: 'cinematic' | 'hyper-realistic' | 'animated' | 'documentary' | 'abstract';
  aspectRatio: '16:9' | '9:16' | '4:5' | '1:1';
}

interface Scene {
  sceneNumber: number;
  voiceoverText: string;
  imagePrompt: string;
}

const STYLE_DESCRIPTIONS: Record<string, string> = {
  'cinematic': 'dramatic lighting, film grain, wide angle, 4K cinematic quality, movie scene',
  'hyper-realistic': 'photorealistic, ultra detailed, sharp focus, 8K resolution, professional photography',
  'animated': '3D animated style, Pixar-like, vibrant colors, stylized, smooth rendering',
  'documentary': 'natural lighting, authentic, journalistic, real-world setting, candid',
  'abstract': 'artistic, conceptual, surreal, vibrant patterns, modern art aesthetic',
};

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
    const body: StoryboardRequest = await req.json();
    const { topic, duration, style, aspectRatio } = body;

    if (!topic || !duration || !style) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: topic, duration, style" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate number of scenes (5 seconds per scene)
    const sceneCount = Math.ceil(duration / 5);
    const styleDescription = STYLE_DESCRIPTIONS[style] || STYLE_DESCRIPTIONS['cinematic'];

    console.log(`[generate-shotstack-storyboard] Generating ${sceneCount} scenes for topic: "${topic}"`);

    // Get Lovable AI API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate storyboard using Lovable AI with tool calling for structured output
    const prompt = `Create a storyboard for a ${duration}-second faceless video about: "${topic}"

Requirements:
- Generate exactly ${sceneCount} scenes (each scene is 5 seconds)
- Each scene needs:
  1. Voiceover text: A short, engaging narration (15-25 words max per scene)
  2. Image prompt: A detailed prompt for AI image generation matching the visual style

Visual style for all image prompts: ${styleDescription}
Aspect ratio: ${aspectRatio}

The video should:
- Hook viewers in the first 2 seconds
- Build a narrative arc
- End with a memorable conclusion or call to action
- Use simple, conversational language in voiceovers

Generate the storyboard now:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional video scriptwriter. Generate engaging, viral-worthy content for short-form videos." },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_storyboard",
              description: "Create a video storyboard with scenes",
              parameters: {
                type: "object",
                properties: {
                  scenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sceneNumber: { type: "number", description: "Scene number starting from 1" },
                        voiceoverText: { type: "string", description: "The narration text for this scene (15-25 words)" },
                        imagePrompt: { type: "string", description: "Detailed AI image generation prompt for the visual" }
                      },
                      required: ["sceneNumber", "voiceoverText", "imagePrompt"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["scenes"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_storyboard" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-shotstack-storyboard] AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${errorText}`);
    }

    const data = await response.json();
    
    // Extract scenes from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("[generate-shotstack-storyboard] No tool call in response:", JSON.stringify(data));
      throw new Error("Failed to generate storyboard structure");
    }

    const storyboardData = JSON.parse(toolCall.function.arguments);
    const scenes: Scene[] = storyboardData.scenes;

    if (!scenes || scenes.length === 0) {
      throw new Error("No scenes generated");
    }

    // Enhance image prompts with style
    const enhancedScenes = scenes.map((scene, index) => ({
      ...scene,
      sceneNumber: index + 1,
      imagePrompt: `${scene.imagePrompt}, ${styleDescription}, ${aspectRatio} aspect ratio`
    }));

    console.log(`[generate-shotstack-storyboard] Generated ${enhancedScenes.length} scenes successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        scenes: enhancedScenes,
        metadata: {
          topic,
          duration,
          style,
          aspectRatio,
          sceneCount: enhancedScenes.length
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-shotstack-storyboard] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
