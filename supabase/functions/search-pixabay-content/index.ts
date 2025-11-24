import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";



serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('search-pixabay-content', requestId);
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const { query, type = 'video', orientation, per_page = 20 } = await req.json();

    if (!query) {
      throw new Error('Query parameter is required');
    }

    const pixabayApiKey = Deno.env.get('PIXABAY_API_KEY');
    if (!pixabayApiKey) {
      throw new Error('Pixabay API key not configured');
    }

    let apiUrl: string;
    const params = new URLSearchParams({
      key: pixabayApiKey,
      q: query,
      per_page: per_page.toString(),
      safesearch: 'true',
    });

    if (type === 'video') {
      apiUrl = 'https://pixabay.com/api/videos/';
      if (orientation) {
        params.append('video_type', orientation);
      }
    } else {
      apiUrl = 'https://pixabay.com/api/';
      if (orientation) {
        params.append('orientation', orientation);
      }
      params.append('image_type', 'photo');
    }

    logger.info('Searching Pixabay', { metadata: { type, query, orientation } });

    const response = await fetch(`${apiUrl}?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Pixabay API error', new Error(errorText));
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data = await response.json();
    logger.info('Pixabay search completed', { metadata: { total: data.total, type } });
    logger.logDuration('Pixabay search', startTime);

    // Transform response to unified format
    const items = type === 'video' 
      ? data.hits.map((hit: any) => ({
          id: hit.id,
          type: 'video',
          preview: hit.videos.tiny.thumbnail,
          videoURL: hit.videos.large.url || hit.videos.medium.url,
          duration: hit.duration,
          width: hit.videos.large.width || hit.videos.medium.width,
          height: hit.videos.large.height || hit.videos.medium.height,
        }))
      : data.hits.map((hit: any) => ({
          id: hit.id,
          type: 'image',
          preview: hit.previewURL,
          fullHDURL: hit.fullHDURL,
          imageURL: hit.imageURL,
          largeImageURL: hit.largeImageURL,
          vectorURL: hit.vectorURL,
          width: hit.imageWidth,
          height: hit.imageHeight,
        }));

    return new Response(
      JSON.stringify({ items, total: data.total }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Error in search-pixabay-content', error as Error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
