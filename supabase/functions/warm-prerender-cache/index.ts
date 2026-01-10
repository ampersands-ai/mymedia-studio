/**
 * Warm Pre-render Cache Edge Function
 * Proactively pre-renders important pages for cache warming
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WarmRequest {
  categories?: ('models' | 'templates' | 'blog' | 'static')[];
  limit?: number;
  force_refresh?: boolean;
}

interface WarmResponse {
  success: boolean;
  total_pages: number;
  rendered_count: number;
  failed_count: number;
  skipped_count: number;
  pages: Array<{
    path: string;
    status: 'rendered' | 'cached' | 'failed';
    render_time_ms?: number;
    error?: string;
  }>;
  error?: string;
}

// Static pages that should always be pre-rendered
const STATIC_PAGES = [
  '/',
  '/pricing',
  '/templates',
  '/models',
  '/models/image',
  '/models/video',
  '/models/audio',
  '/blog',
  '/faq',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { 
      categories = ['models', 'templates', 'blog', 'static'], 
      limit = 100,
      force_refresh = false 
    }: WarmRequest = await req.json().catch(() => ({}));

    console.log(`[WarmCache] Starting cache warming for categories: ${categories.join(', ')}, limit: ${limit}`);

    // Collect all pages to render
    const pagesToRender: string[] = [];

    // Add static pages
    if (categories.includes('static')) {
      pagesToRender.push(...STATIC_PAGES);
    }

    // Fetch model pages
    if (categories.includes('models')) {
      const { data: modelPages } = await supabase
        .from('model_pages')
        .select('slug')
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(50);
      
      if (modelPages) {
        pagesToRender.push(...modelPages.map(p => `/models/${p.slug}`));
      }
    }

    // Fetch template pages  
    if (categories.includes('templates')) {
      const { data: templates } = await supabase
        .from('prompt_templates')
        .select('slug')
        .eq('is_published', true)
        .order('use_count', { ascending: false })
        .limit(30);
      
      if (templates) {
        pagesToRender.push(...templates.map(t => `/templates/${t.slug}`));
      }
    }

    // Fetch blog posts
    if (categories.includes('blog')) {
      const { data: blogPosts } = await supabase
        .from('blog_posts')
        .select('slug')
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .limit(30);
      
      if (blogPosts) {
        pagesToRender.push(...blogPosts.map(b => `/blog/${b.slug}`));
      }
    }

    // Deduplicate and limit
    const uniquePages = [...new Set(pagesToRender)].slice(0, limit);
    
    console.log(`[WarmCache] Found ${uniquePages.length} pages to warm`);

    // Check existing cache entries if not forcing refresh
    let pagesToSkip: Set<string> = new Set();
    if (!force_refresh) {
      const { data: cachedPages } = await supabase
        .from('prerender_cache')
        .select('url_path')
        .in('url_path', uniquePages)
        .gt('expires_at', new Date().toISOString());
      
      if (cachedPages) {
        pagesToSkip = new Set(cachedPages.map(c => c.url_path));
        console.log(`[WarmCache] Skipping ${pagesToSkip.size} already cached pages`);
      }
    }

    // Render each page
    const results: WarmResponse['pages'] = [];
    let renderedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Process in batches of 5 for rate limiting
    const batchSize = 5;
    for (let i = 0; i < uniquePages.length; i += batchSize) {
      const batch = uniquePages.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (path) => {
        // Skip if already cached
        if (pagesToSkip.has(path)) {
          results.push({ path, status: 'cached' });
          skippedCount++;
          return;
        }

        try {
          const prerenderStart = Date.now();
          
          const { data, error } = await supabase.functions.invoke('prerender', {
            body: { url_path: path, force_refresh },
          });
          
          const renderTime = Date.now() - prerenderStart;

          if (error || !data?.success) {
            throw new Error(error?.message || data?.error || 'Render failed');
          }

          results.push({ 
            path, 
            status: 'rendered',
            render_time_ms: data.render_time_ms || renderTime,
          });
          renderedCount++;
          
          console.log(`[WarmCache] Rendered: ${path} (${renderTime}ms)`);
          
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Unknown error';
          results.push({ path, status: 'failed', error: errorMsg });
          failedCount++;
          console.error(`[WarmCache] Failed: ${path} - ${errorMsg}`);
        }
      }));

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < uniquePages.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[WarmCache] Completed in ${totalTime}ms: ${renderedCount} rendered, ${skippedCount} cached, ${failedCount} failed`);

    const response: WarmResponse = {
      success: true,
      total_pages: uniquePages.length,
      rendered_count: renderedCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
      pages: results,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WarmCache] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        total_pages: 0,
        rendered_count: 0,
        failed_count: 0,
        skipped_count: 0,
        pages: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
