import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { ResponseBuilder } from "../_shared/response-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMOTION_SERVE_URL = Deno.env.get("REMOTION_SERVE_URL");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return;
  }
  
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Artifio <noreply@artifio.ai>",
        to,
        subject,
        html,
      }),
    });
  } catch (e) {
    console.error("Email failed:", e);
  }
}

async function sendWebhook(url: string, payload: Record<string, unknown>) {
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Artifio-Event": String(payload.status),
      },
      body: JSON.stringify({
        event: payload.status,
        jobId: payload.jobId,
        timestamp: new Date().toISOString(),
        data: payload,
      }),
    });
  } catch (e) {
    console.error("Webhook failed:", e);
  }
}

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger("render-animation", requestId);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { jobId } = await req.json();

    if (!jobId) {
      return ResponseBuilder.validationError("jobId required", undefined, corsHeaders);
    }

    logger.info("Starting render for job", { metadata: { jobId } });

    const { data: job, error: fetchError } = await supabase
      .from("animation_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      logger.warn("Job not found", { metadata: { jobId } });
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (job.status !== "pending_render") {
      return new Response(
        JSON.stringify({ error: `Invalid status: ${job.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update to rendering status
    await supabase
      .from("animation_jobs")
      .update({
        status: "rendering",
        render_started_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    try {
      // MVP Mode: Use placeholder if Remotion not configured
      if (!REMOTION_SERVE_URL) {
        logger.info("MVP mode - using placeholder video", { metadata: { jobId } });
        
        // Simulate render time
        await new Promise((r) => setTimeout(r, 2000));
        
        const placeholderUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

        await supabase
          .from("animation_jobs")
          .update({
            status: "completed",
            video_url: placeholderUrl,
            render_cost: 0,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);

        // Send notifications
        if (job.callback_email) {
          await sendEmail(
            job.callback_email,
            "🎬 Your video is ready!",
            `<h1>Video Ready!</h1><p><a href="${placeholderUrl}">Download your video</a></p>`
          );
        }

        if (job.webhook_url) {
          await sendWebhook(job.webhook_url, {
            jobId,
            status: "completed",
            videoUrl: placeholderUrl,
          });
        }

        logger.info("Animation render completed (MVP mode)", { metadata: { jobId } });

        return ResponseBuilder.success(
          {
            jobId,
            status: "completed",
            videoUrl: placeholderUrl,
            message: "MVP mode: placeholder video. Configure Remotion for real rendering.",
          },
          200,
          corsHeaders
        );
      }

      // TODO: Add actual Remotion Lambda integration here
      throw new Error("Remotion Lambda integration not yet implemented");
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Render failed";
      
      await supabase
        .from("animation_jobs")
        .update({ status: "failed", error_message: errorMessage })
        .eq("id", jobId);

      logger.error("Render failed", error as Error, { metadata: { jobId } });

      // Send failure notifications
      if (job.callback_email) {
        await sendEmail(
          job.callback_email,
          "⚠️ Render failed",
          `<p>Error: ${errorMessage}</p>`
        );
      }

      if (job.webhook_url) {
        await sendWebhook(job.webhook_url, {
          jobId,
          status: "failed",
          error: errorMessage,
        });
      }

      return ResponseBuilder.error(new Error(errorMessage), "render-animation", corsHeaders);
    }
  } catch (error) {
    logger.error("Unexpected error", error as Error);
    return ResponseBuilder.error(error as Error, "render-animation", corsHeaders);
  }
});
