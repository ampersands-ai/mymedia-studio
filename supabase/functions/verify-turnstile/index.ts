import { getCorsHeaders, handleCorsPreflight, getResponseHeaders } from "../_shared/cors.ts";

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  const headers = { ...getResponseHeaders(req), "Content-Type": "application/json" };

  try {
    const { token, remoteip } = await req.json();

    if (!token) {
      console.error("[verify-turnstile] Missing token");
      return new Response(
        JSON.stringify({ success: false, error: "Missing Turnstile token" }),
        { status: 400, headers }
      );
    }

    const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secretKey) {
      console.error("[verify-turnstile] TURNSTILE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Turnstile not configured" }),
        { status: 500, headers }
      );
    }

    // Verify the token with Cloudflare
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteip) {
      formData.append("remoteip", remoteip);
    }

    console.log("[verify-turnstile] Verifying token with Cloudflare...");

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    const result: TurnstileResponse = await verifyResponse.json();

    console.log("[verify-turnstile] Cloudflare response:", {
      success: result.success,
      hostname: result.hostname,
      errorCodes: result["error-codes"],
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Turnstile verification failed",
          codes: result["error-codes"],
        }),
        { status: 400, headers }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        hostname: result.hostname,
        challenge_ts: result.challenge_ts,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("[verify-turnstile] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers }
    );
  }
});
