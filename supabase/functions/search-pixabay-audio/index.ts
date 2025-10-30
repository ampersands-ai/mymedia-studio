import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, per_page = 20 } = await req.json();

    if (!query) {
      throw new Error('Search query is required');
    }

    const PIXABAY_API_KEY = Deno.env.get('PIXABAY_API_KEY');
    if (!PIXABAY_API_KEY) {
      throw new Error('PIXABAY_API_KEY not configured');
    }

    console.log('[search-pixabay-audio] Searching:', query);

    // Build Pixabay Audio API URL
    const url = new URL('https://pixabay.com/api/');
    url.searchParams.append('key', PIXABAY_API_KEY);
    url.searchParams.append('q', query);
    url.searchParams.append('per_page', per_page.toString());

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('[search-pixabay-audio] API error:', response.status);
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Pixabay response with robust key mapping
    const items = (data.hits || []).map((hit: any) => {
      const name = hit.name || hit.title || `Track ${hit.id}`;
      const duration = Number(hit.duration) || 0;
      const previewURL = hit.previewURL || hit.preview_url || hit.preview?.url || '';
      const audioURL = hit.audioURL || hit.audio_url || hit.url || '';
      const genre = (hit.genre && hit.genre !== 'Unknown') ? hit.genre : (hit.category || '');
      
      return {
        id: hit.id,
        name,
        tags: hit.tags || '',
        duration,
        previewURL: previewURL || audioURL,
        audioURL: audioURL || previewURL,
        genre,
      };
    });

    console.log('[search-pixabay-audio] Found:', items.length, 'tracks');

    return new Response(
      JSON.stringify({ items }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[search-pixabay-audio] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
