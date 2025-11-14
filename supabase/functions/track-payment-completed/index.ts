import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const POSTHOG_API_KEY = Deno.env.get("VITE_POSTHOG_KEY");
const POSTHOG_HOST = "https://app.posthog.com";

Deno.serve(async (req) => {
  const logger = new EdgeLogger('track-payment-completed', crypto.randomUUID());
  try {
    const { user_id, plan_name, billing_period, amount } = await req.json();

    if (!POSTHOG_API_KEY) {
      logger.info('PostHog API key not configured', { 
        metadata: { userId: user_id, planName: plan_name }
      });
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
      const errorText = await response.text();
      logger.error('PostHog tracking failed', new Error(errorText), { 
        metadata: { userId: user_id, planName: plan_name, amount, billingPeriod: billing_period }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error('Error tracking payment', error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
