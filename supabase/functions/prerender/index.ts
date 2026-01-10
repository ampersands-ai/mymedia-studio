/**
 * Pre-render Edge Function
 * Renders pages to static HTML using Browserless.io for SEO and crawler optimization
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PrerenderRequest {
  url_path: string;
  force_refresh?: boolean;
  cache_duration_hours?: number;
}

interface PrerenderResponse {
  success: boolean;
  html?: string;
  cached: boolean;
  rendered_at?: string;
  render_time_ms?: number;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    if (!browserlessApiKey) {
      throw new Error('Missing BROWSERLESS_API_KEY');
    }

    // Parse request
    const { url_path, force_refresh = false, cache_duration_hours = 24 }: PrerenderRequest = await req.json();
    
    if (!url_path) {
      return new Response(
        JSON.stringify({ success: false, error: 'url_path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize the URL path
    const normalizedPath = url_path.startsWith('/') ? url_path : `/${url_path}`;
    
    console.log(`[Prerender] Processing: ${normalizedPath}, force_refresh: ${force_refresh}`);

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first (unless force_refresh)
    if (!force_refresh) {
      const { data: cached, error: cacheError } = await supabase
        .from('prerender_cache')
        .select('*')
        .eq('url_path', normalizedPath)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (cached && !cacheError) {
        console.log(`[Prerender] Cache hit for: ${normalizedPath}`);
        
        const response: PrerenderResponse = {
          success: true,
          html: cached.rendered_html,
          cached: true,
          rendered_at: cached.rendered_at,
          render_time_ms: cached.render_time_ms,
        };
        
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[Prerender] Cache miss, rendering: ${normalizedPath}`);

    // Build the full URL to render
    // Use the production domain
    const baseUrl = 'https://artifio.ai';
    const fullUrl = `${baseUrl}${normalizedPath}`;

    // Call Browserless.io to render the page
    const renderStartTime = Date.now();
    
    const browserlessResponse = await fetch('https://chrome.browserless.io/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(browserlessApiKey + ':')}`,
      },
      body: JSON.stringify({
        url: fullUrl,
        gotoOptions: {
          waitUntil: 'networkidle0',
          timeout: 30000,
        },
        waitForSelector: {
          selector: '#root',
          timeout: 10000,
        },
        // Wait for React to hydrate
        waitForFunction: {
          fn: 'document.querySelector("#root").innerHTML.length > 100',
          timeout: 15000,
        },
        // Remove scripts to reduce HTML size
        removeScriptTags: true,
        // Set viewport for consistent rendering
        viewport: {
          width: 1280,
          height: 800,
        },
      }),
    });

    const renderTimeMs = Date.now() - renderStartTime;

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text();
      console.error(`[Prerender] Browserless error: ${browserlessResponse.status} - ${errorText}`);
      throw new Error(`Browserless rendering failed: ${browserlessResponse.status}`);
    }

    const html = await browserlessResponse.text();
    const htmlSizeBytes = new Blob([html]).size;

    console.log(`[Prerender] Rendered ${normalizedPath} in ${renderTimeMs}ms, size: ${htmlSizeBytes} bytes`);

    // Cache the rendered HTML
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + cache_duration_hours);

    const { error: upsertError } = await supabase
      .from('prerender_cache')
      .upsert({
        url_path: normalizedPath,
        rendered_html: html,
        rendered_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        render_time_ms: renderTimeMs,
        html_size_bytes: htmlSizeBytes,
      }, {
        onConflict: 'url_path',
      });

    if (upsertError) {
      console.error(`[Prerender] Cache upsert error:`, upsertError);
      // Don't fail the request, just log the error
    }

    const response: PrerenderResponse = {
      success: true,
      html,
      cached: false,
      rendered_at: new Date().toISOString(),
      render_time_ms: renderTimeMs,
    };

    console.log(`[Prerender] Total time: ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Prerender] Error:', error);
    
    const response: PrerenderResponse = {
      success: false,
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
