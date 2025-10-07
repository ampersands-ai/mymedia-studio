import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const bucket = url.searchParams.get("bucket") || "generated-content";
    const path = url.searchParams.get("path");

    if (!path) {
      return new Response(JSON.stringify({ error: "Missing 'path' query parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create a short-lived signed URL to the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60); // 1 minute is enough for proxied fetch

    if (error || !data?.signedUrl) {
      console.error("Failed to create signed URL:", error);
      return new Response(JSON.stringify({ error: "File not found or not accessible" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward Range header for proper streaming support
    const range = req.headers.get("range");
    const upstreamRes = await fetch(data.signedUrl, {
      headers: range ? { Range: range } : undefined,
    });

    // Copy essential headers for media streaming
    const headers = new Headers(corsHeaders);
    const passthroughHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "etag",
      "last-modified",
    ];

    passthroughHeaders.forEach((h) => {
      const v = upstreamRes.headers.get(h);
      if (v) headers.set(h, v);
    });

    // Ensure Accept-Ranges is present for seeking
    if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (err) {
    console.error("Streaming proxy error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});