import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";



serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('search-pixabay-audio', requestId);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
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

    logger.info('Searching Pixabay audio', { metadata: { query, per_page } });

    // Build Pixabay Audio API URL
    const url = new URL(API_ENDPOINTS.PIXABAY.apiUrl);
    url.searchParams.append('key', PIXABAY_API_KEY);
    url.searchParams.append('q', query);
    url.searchParams.append('per_page', per_page.toString());

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      logger.error('Pixabay API error', new Error(`Status ${response.status}`), {
        metadata: { query, status: response.status }
      });
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Pixabay response with robust key mapping
    const items = (data.hits || []).map((hit: { id: number; name?: string; title?: string; duration?: number; previewURL?: string; preview_url?: string; preview?: { url?: string }; audioURL?: string; audio_url?: string; url?: string; genre?: string; category?: string; pageURL?: string; tags?: string; user?: string; user_id?: number }) => {
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

    logger.info('Search completed', { metadata: { query, resultsCount: items.length } });

    return new Response(
      JSON.stringify({ items }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Search failed', error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
