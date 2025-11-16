import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range, if-none-match, if-modified-since",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

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

    // Forward Range header for proper streaming support
    const range = req.headers.get("range");

    const logger = new EdgeLogger('stream-content', requestId, supabase, false);
    logger.debug('Stream request', { metadata: { bucket, path, hasRange: !!range } });

    // Create a short-lived signed URL to the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60); // 1 minute is enough for proxied fetch

    if (error || !data?.signedUrl) {
      logger.error("Failed to create signed URL", error ?? undefined, { metadata: { bucket, path } });
      return new Response(JSON.stringify({ error: "File not found or not accessible" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for conditional requests
    const ifNoneMatch = req.headers.get("if-none-match");
    const ifModifiedSince = req.headers.get("if-modified-since");

    // Build upstream headers
    const upstreamHeaders: HeadersInit = {};
    if (range) upstreamHeaders["Range"] = range;
    if (ifNoneMatch) upstreamHeaders["If-None-Match"] = ifNoneMatch;
    if (ifModifiedSince) upstreamHeaders["If-Modified-Since"] = ifModifiedSince;

    const upstreamRes = await fetch(data.signedUrl, {
      headers: Object.keys(upstreamHeaders).length > 0 ? upstreamHeaders : undefined,
    });

    // If not modified, return 304
    if (upstreamRes.status === 304) {
      return new Response(null, {
        status: 304,
        headers: new Headers(corsHeaders),
      });
    }

    // Copy essential headers for media streaming
    const headers = new Headers(corsHeaders);
    const passthroughHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ];

    passthroughHeaders.forEach((h) => {
      const v = upstreamRes.headers.get(h);
      if (v) headers.set(h, v);
    });

    // Generate ETag if not present
    if (!headers.has("etag")) {
      const etag = `"${path.replace(/\//g, '-')}-${Date.now()}"`;
      headers.set("etag", etag);
    }

    // Add Last-Modified if not present
    if (!headers.has("last-modified")) {
      headers.set("last-modified", new Date().toUTCString());
    }

    // Ensure Accept-Ranges is present for seeking
    if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");

    // Aggressive CDN caching for immutable video content (1 year)
    const isVideo = headers.get("content-type")?.startsWith("video/");
    const isAudio = headers.get("content-type")?.startsWith("audio/");
    
    if (isVideo || isAudio) {
      // Immutable content - cache for 1 year
      headers.set("cache-control", "public, max-age=31536000, immutable");
      headers.set("cdn-cache-control", "public, max-age=31536000");
      headers.set("surrogate-control", "public, max-age=31536000");
    } else {
      // Other content - cache for 24 hours
      headers.set("cache-control", "public, max-age=86400");
      headers.set("cdn-cache-control", "public, max-age=86400");
    }

    // Performance optimization headers
    headers.set("connection", "keep-alive");
    headers.set("cross-origin-resource-policy", "cross-origin");
    
    // Log cache status for monitoring (EdgeLogger added in main block)
    const cacheStatus = upstreamRes.headers.get("cf-cache-status") || "UNKNOWN";

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (err) {
    return createSafeErrorResponse(err, "stream-content", corsHeaders);
  }
});