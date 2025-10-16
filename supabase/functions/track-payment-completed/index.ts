import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const POSTHOG_API_KEY = Deno.env.get("VITE_POSTHOG_KEY");
const POSTHOG_HOST = "https://app.posthog.com";

serve(async (req) => {
  try {
    const { user_id, plan_name, billing_period, amount } = await req.json();

    if (!POSTHOG_API_KEY) {
      console.log("PostHog API key not configured");
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Track payment completed event in PostHog
    const response = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event: "payment_completed",
        distinct_id: user_id,
        properties: {
          plan_name,
          billing_period,
          amount,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      console.error("PostHog tracking failed:", await response.text());
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error tracking payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
