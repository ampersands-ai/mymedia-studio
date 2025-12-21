import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { ResponseBuilder } from "../_shared/response-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface AnimationRequest {
  script: string;
  audioUrl?: string;
  timestamps?: Array<{ word: string; start: number; end: number }>;
  duration: number;
  style?: "stick-figure" | "illustrated" | "minimal" | "icon-based";
  captionStyle?: string;
  backgroundType?: "video" | "image" | "animated" | "gradient";
  backgroundUrl?: string;
  backgroundStyle?: string;
  overlayType?: "none" | "explainer" | "icons" | "data-viz";
  colorScheme?: { primary: string; secondary: string; background: string; accent: string };
  webhookUrl?: string;
  callbackEmail?: string;
}

interface Scene {
  id: number;
  name: string;
  startTime: number;
  endTime: number;
  title?: string;
  content?: string;
  icon?: string;
  visualConcepts?: string[];
  emotion?: string;
}

// LLM Providers
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const providerHealth = {
  anthropic: { healthy: true, lastError: 0 },
  openai: { healthy: true, lastError: 0 },
};

async function callClaude(prompt: string, model: string, maxTokens: number = 4000) {
  if (Date.now() - providerHealth.anthropic.lastError < 60000 && !providerHealth.anthropic.healthy) {
    throw new Error("Anthropic temporarily unavailable");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    providerHealth.anthropic.healthy = false;
    providerHealth.anthropic.lastError = Date.now();
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    tokensUsed: { input: data.usage.input_tokens, output: data.usage.output_tokens },
  };
}

async function callOpenAI(prompt: string, model: string, maxTokens: number = 4000) {
  if (Date.now() - providerHealth.openai.lastError < 60000 && !providerHealth.openai.healthy) {
    throw new Error("OpenAI temporarily unavailable");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    providerHealth.openai.healthy = false;
    providerHealth.openai.lastError = Date.now();
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokensUsed: { input: data.usage.prompt_tokens, output: data.usage.completion_tokens },
  };
}

async function callLLM(prompt: string, task: "analysis" | "generation") {
  const isAnalysis = task === "analysis";

  try {
    const model = isAnalysis ? "claude-3-5-haiku-20241022" : "claude-sonnet-4-20250514";
    const result = await callClaude(prompt, model, isAnalysis ? 2000 : 8000);
    const pricing = isAnalysis ? { input: 1, output: 5 } : { input: 3, output: 15 };
    const cost = (result.tokensUsed.input * pricing.input + result.tokensUsed.output * pricing.output) / 1_000_000;
    return { content: result.content, provider: model, cost };
  } catch (error) {
    console.warn("Claude failed, trying OpenAI:", (error as Error).message);
  }

  try {
    const model = isAnalysis ? "gpt-4o-mini" : "gpt-4o";
    const result = await callOpenAI(prompt, model, isAnalysis ? 2000 : 8000);
    const pricing = isAnalysis ? { input: 0.15, output: 0.6 } : { input: 2.5, output: 10 };
    const cost = (result.tokensUsed.input * pricing.input + result.tokensUsed.output * pricing.output) / 1_000_000;
    return { content: result.content, provider: model, cost };
  } catch (error) {
    throw new Error(`All LLM providers failed: ${(error as Error).message}`);
  }
}

// Scene Analysis
const ANALYSIS_PROMPT = `Analyze this script for an animated explainer video. Break it into 4-8 logical scenes.

SCRIPT: {script}

DURATION: {duration} seconds

Return a JSON object (no markdown):
{
  "scenes": [
    {
      "id": 1,
      "name": "scene_name",
      "startTime": 0,
      "endTime": 10.5,
      "title": "Short Title",
      "content": "Brief description",
      "icon": "emoji",
      "visualConcepts": ["concept1", "concept2"],
      "emotion": "curious|excited|concerned|hopeful|happy|sad|neutral"
    }
  ],
  "overallTone": "educational|motivational|dramatic|humorous",
  "complexity": "low|medium|high"
}`;

async function analyzeScript(script: string, duration: number) {
  const prompt = ANALYSIS_PROMPT.replace("{script}", script).replace("{duration}", String(duration));
  const result = await callLLM(prompt, "analysis");

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const analysis = JSON.parse(jsonMatch[0]);
    return { analysis, cost: result.cost };
  } catch {
    const segmentDuration = duration / 5;
    return {
      analysis: {
        scenes: Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          name: `scene_${i + 1}`,
          startTime: i * segmentDuration,
          endTime: (i + 1) * segmentDuration,
          title: `Part ${i + 1}`,
          icon: ["🎯", "💡", "🚀", "✨", "🎉"][i],
          emotion: "neutral",
        })),
        overallTone: "educational",
        complexity: "medium",
      },
      cost: result.cost,
    };
  }
}

// Caption Presets
const CAPTION_PRESETS: Record<string, Record<string, unknown>> = {
  karaoke: {
    style: "karaoke",
    font: "system-ui, sans-serif",
    fontSize: 56,
    fontWeight: 800,
    color: "#ffffff",
    highlightColor: "#22c55e",
    strokeColor: "#000000",
    strokeWidth: 3,
    showBackground: false,
    position: "center",
    wordsPerLine: 4,
    lineTransition: "slide",
  },
  bounce: {
    style: "bounce",
    font: "system-ui, sans-serif",
    fontSize: 52,
    fontWeight: 900,
    color: "#ffffff",
    highlightColor: "#f59e0b",
    strokeColor: "#000000",
    strokeWidth: 4,
    showBackground: false,
    position: "center",
    wordsPerLine: 3,
  },
  typewriter: {
    style: "typewriter",
    font: "Courier New, monospace",
    fontSize: 38,
    fontWeight: 500,
    color: "#22c55e",
    highlightColor: "#4ade80",
    backgroundColor: "#000000",
    backgroundOpacity: 0.9,
    position: "bottom",
    wordsPerLine: 6,
  },
  wave: {
    style: "wave",
    font: "Georgia, serif",
    fontSize: 44,
    fontWeight: 600,
    color: "#f8fafc",
    highlightColor: "#60a5fa",
    backgroundColor: "#0f172a",
    backgroundOpacity: 0.7,
    position: "bottom",
    wordsPerLine: 5,
  },
  highlight: {
    style: "highlight",
    font: "system-ui, sans-serif",
    fontSize: 48,
    fontWeight: 700,
    color: "#1e293b",
    highlightColor: "#fde047",
    backgroundColor: "#ffffff",
    backgroundOpacity: 0.95,
    position: "bottom",
    wordsPerLine: 5,
  },
  static: {
    style: "static",
    font: "system-ui, sans-serif",
    fontSize: 42,
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "#000000",
    backgroundOpacity: 0.5,
    position: "bottom",
    wordsPerLine: 6,
  },
};

const DEFAULT_COLORS = { primary: "#22c55e", secondary: "#94a3b8", background: "#0f172a", accent: "#f59e0b" };

function buildVideoConfig(request: AnimationRequest, scenes: Scene[]) {
  const colors = request.colorScheme || DEFAULT_COLORS;

  let background: Record<string, unknown>;
  switch (request.backgroundType) {
    case "video":
      background = { type: "video", src: request.backgroundUrl, overlay: { color: "#000", opacity: 0.3 } };
      break;
    case "image":
      background = { type: "image", src: request.backgroundUrl, overlay: { color: "#000", opacity: 0.3 } };
      break;
    case "animated":
      background = { type: "animated", animatedStyle: request.backgroundStyle || "particles" };
      break;
    default:
      background = { type: "gradient", gradient: { type: "linear", colors: [colors.background, "#1e293b"], angle: 180 } };
  }

  let overlay: Record<string, unknown> | undefined = undefined;
  if (request.overlayType === "explainer") {
    overlay = {
      type: "explainer",
      style: request.style || "stick-figure",
      scenes: scenes.map((s) => ({ ...s })),
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
      },
      position: "fullscreen",
    };
  } else if (request.overlayType === "icons") {
    overlay = {
      type: "icons",
      style: "icon-based",
      icons: scenes
        .filter((s) => s.icon)
        .map((s, i) => ({
          emoji: s.icon!,
          animation: ["float", "bounce", "pulse", "spin"][i % 4],
          delay: i * 15,
        })),
      opacity: 0.7,
    };
  }

  const captionPreset = CAPTION_PRESETS[request.captionStyle || "karaoke"];
  const captions = request.timestamps?.length
    ? {
        ...captionPreset,
        highlightColor: colors.primary,
        words: request.timestamps,
      }
    : undefined;

  const audio: Record<string, unknown> = {};
  if (request.audioUrl) audio.voiceover = { src: request.audioUrl, volume: 1 };

  return {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: request.duration,
    background,
    overlay,
    captions,
    audio,
  };
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger("generate-animation", requestId);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return ResponseBuilder.unauthorized("Missing authorization header", corsHeaders);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      logger.warn("Authentication failed", { errorMessage: authError?.message });
      return ResponseBuilder.unauthorized("Invalid token", corsHeaders);
    }

    const request: AnimationRequest = await req.json();
    logger.info("Received animation request", { metadata: { userId: user.id, duration: request.duration } });

    // Validation
    if (!request.script || request.script.length < 10) {
      return ResponseBuilder.validationError("Script required (min 10 chars)", undefined, corsHeaders);
    }
    if (!request.duration || request.duration < 5 || request.duration > 300) {
      return ResponseBuilder.validationError("Duration must be 5-300 seconds", undefined, corsHeaders);
    }

    // Create job record
    const { data: job, error: insertError } = await supabase
      .from("animation_jobs")
      .insert({
        user_id: user.id,
        script: request.script,
        audio_url: request.audioUrl,
        duration: request.duration,
        style: request.style || "stick-figure",
        caption_style: request.captionStyle || "karaoke",
        background_type: request.backgroundType || "animated",
        overlay_type: request.overlayType || "explainer",
        color_scheme: request.colorScheme || DEFAULT_COLORS,
        status: "analyzing",
        webhook_url: request.webhookUrl,
        callback_email: request.callbackEmail,
      })
      .select()
      .single();

    if (insertError || !job) {
      logger.error("Failed to create job", new Error(insertError?.message || "Unknown error"));
      return ResponseBuilder.error(new Error("Failed to create job"), "generate-animation", corsHeaders);
    }

    const jobId = job.id;
    logger.info("Created animation job", { metadata: { jobId } });

    let totalCost = 0;

    try {
      // Analyze script
      const { analysis, cost: analysisCost } = await analyzeScript(request.script, request.duration);
      totalCost += analysisCost;

      await supabase
        .from("animation_jobs")
        .update({ status: "building_config", scenes: analysis.scenes })
        .eq("id", jobId);

      // Build video config
      const videoConfig = buildVideoConfig(request, analysis.scenes);

      await supabase
        .from("animation_jobs")
        .update({
          status: "pending_render",
          video_config: videoConfig,
          llm_cost: totalCost,
        })
        .eq("id", jobId);

      logger.info("Animation job ready for render", { metadata: { jobId, totalCost } });

      return ResponseBuilder.success(
        {
          jobId,
          status: "pending_render",
          scenes: analysis.scenes,
          config: videoConfig,
          estimatedCost: totalCost,
        },
        202,
        corsHeaders
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await supabase.from("animation_jobs").update({ status: "failed", error_message: errorMessage }).eq("id", jobId);
      logger.error("Animation generation failed", error as Error, { metadata: { jobId } });
      
      return ResponseBuilder.error(new Error(errorMessage), "generate-animation", corsHeaders);
    }
  } catch (error) {
    logger.error("Unexpected error", error as Error);
    return ResponseBuilder.error(error as Error, "generate-animation", corsHeaders);
  }
});
