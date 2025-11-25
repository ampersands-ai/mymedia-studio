import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('get-voices', requestId);
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      logger.critical('ELEVENLABS_API_KEY is not configured', new Error('Missing API key'));
      throw new Error('Voice service configuration error');
    }

    logger.info('Fetching voices from ElevenLabs');

    const response = await fetch(`${API_ENDPOINTS.ELEVENLABS.fullUrl}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('ElevenLabs API error', new Error(errorText), {
        metadata: { status: response.status }
      });
      throw new Error(`ElevenLabs API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      logger.error('Invalid response structure', new Error('Invalid data'));
      throw new Error('Invalid response from voice service');
    }

    if (!Array.isArray(data.voices)) {
      logger.error('Missing voices array in response', new Error('Invalid data structure'));
      throw new Error('Invalid voice data received');
    }

    logger.info('Successfully fetched voices', { metadata: { count: data.voices.length } });
    logger.logDuration('Fetch voices', startTime);

    interface Voice {
      voice_id: string;
      preview_url?: string;
      [key: string]: unknown;
    }

    // Only add Supabase Storage preview URLs for voices that originally have previews
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const voicesWithLocalPreviews = data.voices.map((voice: Voice) => {
      // Only replace preview URL if the voice originally had one
      if (voice.preview_url) {
        return {
          ...voice,
          preview_url: `${SUPABASE_URL}/storage/v1/object/public/voice-previews/${voice.voice_id}.mp3`
        };
      }
      // Return voice without preview_url if it didn't have one
      return {
        ...voice,
        preview_url: undefined
      };
    });

    return new Response(
      JSON.stringify({ voices: voicesWithLocalPreviews }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Error in get-voices function', error as Error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch voices';
    return new Response(
      JSON.stringify({
        error: errorMsg,
        voices: []
      }),
      {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
