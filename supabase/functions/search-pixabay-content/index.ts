import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type = 'video', orientation, per_page = 20 } = await req.json();

    if (!query) {
      throw new Error('Query parameter is required');
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const pixabayApiKey = Deno.env.get('PIXABAY_API_KEY');
    if (!pixabayApiKey) {
      throw new Error('Pixabay API key not configured');
    }

    let apiUrl: string;
    let params = new URLSearchParams({
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

    console.log(`Searching Pixabay ${type}s:`, query, orientation);

    const response = await fetch(`${apiUrl}?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pixabay API error:', errorText);
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.total} ${type}s`);

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in search-pixabay-content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
