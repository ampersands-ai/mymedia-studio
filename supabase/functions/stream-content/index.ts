import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSafeErrorResponse } from "../_shared/error-handler.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();

  try {
    // 🔒 SECURITY: Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...responseHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's token for auth validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...responseHeaders, "Content-Type": "application/json" },
      });
    }

    // Create service client for storage operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const streamLogger = new EdgeLogger('stream-content', requestId, supabase, false);

    const url = new URL(req.url);
    const bucket = url.searchParams.get("bucket") || "generated-content";
    const path = url.searchParams.get("path");

    if (!path) {
      return new Response(JSON.stringify({ error: "Missing 'path' query parameter" }), {
        status: 400,
        headers: { ...responseHeaders, "Content-Type": "application/json" },
      });
    }

    // 🔒 SECURITY: Validate bucket is allowed
    const allowedBuckets = ["generated-content", "generations", "storyboards"];
    if (!allowedBuckets.includes(bucket)) {
      streamLogger.warn("Unauthorized bucket access attempt", { metadata: { bucket, path, userId: user.id } });
      return new Response(JSON.stringify({ error: "Access denied to bucket" }), {
        status: 403,
        headers: { ...responseHeaders, "Content-Type": "application/json" },
      });
    }

    // 🔒 SECURITY: Verify user owns the content
    // Extract generation ID or storyboard ID from path
    const pathParts = path.split('/');
    const resourceId = pathParts[0]; // First part is usually the user_id or generation_id

    // For user-specific paths, verify ownership
    if (bucket === "generated-content" && !path.startsWith(`${user.id}/`)) {
      streamLogger.warn("Unauthorized path access attempt", { metadata: { bucket, path, userId: user.id } });
      return new Response(JSON.stringify({ error: "Access denied to this resource" }), {
        status: 403,
        headers: { ...responseHeaders, "Content-Type": "application/json" },
      });
    }

    streamLogger.debug('Stream request', { metadata: { bucket, path, userId: user.id, hasRange: !!req.headers.get("range") } });

    // Forward Range header for proper streaming support
    const range = req.headers.get("range");

    // Create a short-lived signed URL to the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60); // 1 minute is enough for proxied fetch

    if (error || !data?.signedUrl) {
      streamLogger.error("Failed to create signed URL", error ?? undefined, { metadata: { bucket, path } });
      return new Response(JSON.stringify({ error: "File not found or not accessible" }), {
        status: 404,
        headers: { ...responseHeaders, "Content-Type": "application/json" },
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
        headers: new Headers(responseHeaders),
      });
    }

    // Copy essential headers for media streaming
    const headers = new Headers(responseHeaders);
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

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (err) {
    const responseHeaders = getResponseHeaders(req);
    return createSafeErrorResponse(err, "stream-content", responseHeaders);
  }
});