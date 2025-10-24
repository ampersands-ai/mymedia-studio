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
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY is not configured');
      throw new Error('Voice service configuration error');
    }

    console.log('Fetching all voices from ElevenLabs...');

    // Fetch user's voices (includes shared library voices when show_legacy=false)
    const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices?show_legacy=false', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (!voicesResponse.ok) {
      const errorText = await voicesResponse.text();
      console.error('ElevenLabs API error:', voicesResponse.status, errorText);
      throw new Error(`ElevenLabs API returned ${voicesResponse.status}`);
    }

    const voicesData = await voicesResponse.json();
    
    // Validate response structure
    if (!voicesData || typeof voicesData !== 'object') {
      console.error('Invalid response structure:', voicesData);
      throw new Error('Invalid response from voice service');
    }

    if (!Array.isArray(voicesData.voices)) {
      console.error('Missing voices array in response:', voicesData);
      throw new Error('Invalid voice data received');
    }

    // Try to fetch shared/public voices library for additional voices
    let allVoices = [...voicesData.voices];
    
    try {
      const libraryResponse = await fetch('https://api.elevenlabs.io/v1/shared-voices', {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      });

      if (libraryResponse.ok) {
        const libraryData = await libraryResponse.json();
        if (Array.isArray(libraryData.voices)) {
          console.log(`Fetched ${libraryData.voices.length} additional voices from library`);
          allVoices = [...allVoices, ...libraryData.voices];
        }
      }
    } catch (error) {
      console.log('Could not fetch shared voices library, continuing with standard voices');
    }

    // Deduplicate by voice_id
    const voiceMap = new Map();
    for (const voice of allVoices) {
      if (voice.voice_id && !voiceMap.has(voice.voice_id)) {
        voiceMap.set(voice.voice_id, voice);
      }
    }

    const uniqueVoices = Array.from(voiceMap.values());
    
    console.log(`Total unique voices: ${uniqueVoices.length}`);
    console.log(`Voices with previews: ${uniqueVoices.filter(v => v.preview_url).length}`);

    // Return all voices with their native ElevenLabs preview URLs
    return new Response(
      JSON.stringify({ voices: uniqueVoices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in get-voices function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch voices',
        voices: [] 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
