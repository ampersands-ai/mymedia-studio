/**
 * Invalidate Pre-render Cache Edge Function
 * Purges cached HTML when content changes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvalidateRequest {
  url_paths?: string[];
  pattern?: string;
  invalidate_all?: boolean;
  re_warm?: boolean;
}

interface InvalidateResponse {
  success: boolean;
  deleted_count: number;
  re_warmed?: string[];
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const { url_paths, pattern, invalidate_all = false, re_warm = false }: InvalidateRequest = await req.json();

    console.log(`[InvalidateCache] Request: paths=${url_paths?.length || 0}, pattern=${pattern}, all=${invalidate_all}`);

    let deletedCount = 0;
    let deletedPaths: string[] = [];

    if (invalidate_all) {
      // Delete all cache entries
      const { data: allEntries } = await supabase
        .from('prerender_cache')
        .select('url_path');
      
      deletedPaths = allEntries?.map(e => e.url_path) || [];
      
      const { error } = await supabase
        .from('prerender_cache')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error) throw error;
      deletedCount = deletedPaths.length;
      
      console.log(`[InvalidateCache] Deleted all ${deletedCount} cache entries`);
      
    } else if (url_paths && url_paths.length > 0) {
      // Delete specific paths
      const normalizedPaths = url_paths.map(p => p.startsWith('/') ? p : `/${p}`);
      
      const { data: deleted, error } = await supabase
        .from('prerender_cache')
        .delete()
        .in('url_path', normalizedPaths)
        .select('url_path');
      
      if (error) throw error;
      
      deletedPaths = deleted?.map(e => e.url_path) || [];
      deletedCount = deletedPaths.length;
      
      console.log(`[InvalidateCache] Deleted ${deletedCount} specific cache entries`);
      
    } else if (pattern) {
      // Delete by pattern (e.g., '/models/%' or '/templates/%')
      const { data: matched } = await supabase
        .from('prerender_cache')
        .select('url_path')
        .like('url_path', pattern);
      
      deletedPaths = matched?.map(e => e.url_path) || [];
      
      const { error } = await supabase
        .from('prerender_cache')
        .delete()
        .like('url_path', pattern);
      
      if (error) throw error;
      deletedCount = deletedPaths.length;
      
      console.log(`[InvalidateCache] Deleted ${deletedCount} cache entries matching pattern: ${pattern}`);
    }

    // Re-warm cache if requested
    let reWarmedPaths: string[] = [];
    if (re_warm && deletedPaths.length > 0) {
      console.log(`[InvalidateCache] Re-warming ${deletedPaths.length} paths...`);
      
      // Call prerender function for each deleted path (fire and forget)
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      for (const path of deletedPaths.slice(0, 10)) { // Limit to 10 to avoid timeout
        try {
          await supabase.functions.invoke('prerender', {
            body: { url_path: path, force_refresh: true },
          });
          reWarmedPaths.push(path);
        } catch (e) {
          console.error(`[InvalidateCache] Failed to re-warm ${path}:`, e);
        }
      }
      
      console.log(`[InvalidateCache] Re-warmed ${reWarmedPaths.length} paths`);
    }

    const response: InvalidateResponse = {
      success: true,
      deleted_count: deletedCount,
      re_warmed: re_warm ? reWarmedPaths : undefined,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[InvalidateCache] Error:', error);
    
    const response: InvalidateResponse = {
      success: false,
      deleted_count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
