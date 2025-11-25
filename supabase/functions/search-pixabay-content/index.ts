import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";
import { getErrorMessage } from "../_shared/error-utils.ts";



serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
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
      apiUrl = `${API_ENDPOINTS.PIXABAY.apiUrl}/videos/`;
      if (orientation) {
        params.append('video_type', orientation);
      }
    } else {
      apiUrl = API_ENDPOINTS.PIXABAY.apiUrl;
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

    interface PixabayVideoHit {
      id: number;
      videos: {
        tiny: { thumbnail: string };
        large?: { url: string; width: number; height: number };
        medium: { url: string; width: number; height: number };
      };
      duration: number;
    }

    interface PixabayImageHit {
      id: number;
      previewURL: string;
      fullHDURL?: string;
      imageURL: string;
      largeImageURL: string;
      vectorURL?: string;
      imageWidth: number;
      imageHeight: number;
    }

    // Transform response to unified format
    const items = type === 'video'
      ? data.hits.map((hit: PixabayVideoHit) => ({
          id: hit.id,
          type: 'video',
          preview: hit.videos.tiny.thumbnail,
          videoURL: hit.videos.large?.url || hit.videos.medium.url,
          duration: hit.duration,
          width: hit.videos.large?.width || hit.videos.medium.width,
          height: hit.videos.large?.height || hit.videos.medium.height,
        }))
      : data.hits.map((hit: PixabayImageHit) => ({
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
    const errorMessage = getErrorMessage(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: errorMessage === 'Unauthorized' ? 401 : 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
