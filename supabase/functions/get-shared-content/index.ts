import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit, getClientIP, createRateLimitResponse } from "../_shared/rate-limiter.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('get-shared-content', requestId);
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      logger.warn('Missing token parameter');
      throw new Error('Missing token parameter');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // === RATE LIMITING ===
    // Use client IP + token as identifier to prevent enumeration attacks
    const clientIP = getClientIP(req);
    const rateLimitIdentifier = `${clientIP}:${token.substring(0, 8)}`; // Partial token for privacy
    
    const rateLimitResult = await checkRateLimit(
      supabase,
      rateLimitIdentifier,
      'share_token_access'
    );

    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for shared content access', { 
        metadata: { clientIP, tokenPrefix: token.substring(0, 8) } 
      });
      return createRateLimitResponse(rateLimitResult, responseHeaders);
    }
    
    logger.info('Fetching shared content', { 
      metadata: { 
        tokenPrefix: token.substring(0, 8),
        remainingRequests: rateLimitResult.remaining 
      } 
    });

    // Fetch share token
    const { data: shareToken, error: tokenError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !shareToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired share link' }),
        { status: 404, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (new Date(shareToken.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This share link has expired' }),
        { status: 410, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update view count
    await supabase
      .from('share_tokens')
      .update({ 
        view_count: shareToken.view_count + 1,
        last_viewed_at: new Date().toISOString()
      })
      .eq('id', shareToken.id);

    // Generate temporary signed URL (1 hour)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(shareToken.bucket_name)
      .createSignedUrl(shareToken.storage_path, 3600); // 1 hour

    if (signedError || !signedData) {
      logger.error('Failed to generate signed URL', signedError || new Error('No signed data'));
      throw new Error('Failed to generate signed URL');
    }

    logger.info('Shared content retrieved successfully');
    logger.logDuration('Content retrieval', startTime);

    return new Response(
      JSON.stringify({ 
        success: true,
        signed_url: signedData.signedUrl,
        content_type: shareToken.content_type,
        expires_in: 3600 // seconds
      }),
      { 
        headers: { 
          ...responseHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        } 
      }
    );

  } catch (error) {
    logger.error('Failed to fetch shared content', error as Error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
