import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  to: string;
  userName: string;
  modelId: string;
  failureRate: string;
  failedCount: number;
  totalCount: number;
  threshold: number;
  timeWindow: number;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-model-alert', requestId);
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info("Model alert sending deprecated - feature removed");

    // Model alerts disabled - dependent tables were removed
    // Return 410 Gone to indicate this endpoint is permanently unavailable
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Model alert sending unavailable (feature removed)',
        error: 'Model health monitoring has been deprecated'
      }),
      { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("Error sending alert email", error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
