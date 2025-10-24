import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Only voices with working preview files in storage
const TOP_VOICES = [
  'CwhRBWXzGAHq8TQ4Fs17', // Roger
  'EXAVITQu4vr4xnSDxMaL', // Sarah
  'FGY2WhTYpPnrIDTdsKH5', // Laura
  'IKne3meq5aSn9XLyUdCD', // Charlie
  'JBFqnCBsd6RMkjVDRZzb', // George
  'N2lVS1w4EtoT3dr4eOWO', // Callum
  'SAz9YHcvj6GT2YYXdXww', // River
  'TX3LPaxmHKxFdv7VOQHJ', // Liam
  'Xb7hH8MSUJpSbSDYk0k2', // Alice
  'XrExE9yKIg1WjnnlVkGX', // Matilda
  'bIHbv24MWmeRgasZH58o', // Will
  'cgSgspJ2msm6clMCkdW9', // Jessica
  'cjVigY5qzO86Huf0OWal', // Eric
  'iP95p4xoKVk53GoZ742B', // Chris
  'nPczCjzI2devNBz1zQrb', // Brian
  'onwK4e9ZLuTAKqWW03F9', // Daniel
  'pFZP5JQG7iQjIQuC4Bku', // Lily
  'pqHfZKP75CvOlQylNhV4', // Bill
];

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

    console.log('Fetching voices from ElevenLabs...');

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response from voice service');
    }

    if (!Array.isArray(data.voices)) {
      console.error('Missing voices array in response:', data);
      throw new Error('Invalid voice data received');
    }

    console.log(`Successfully fetched ${data.voices.length} voices`);

    // Filter to only voices with working preview files and replace URLs
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const voicesWithLocalPreviews = data.voices
      .filter((voice: any) => TOP_VOICES.includes(voice.voice_id))
      .map((voice: any) => ({
        ...voice,
        preview_url: `${SUPABASE_URL}/storage/v1/object/public/voice-previews/${voice.voice_id}.mp3`
      }));

    return new Response(
      JSON.stringify({ voices: voicesWithLocalPreviews }),
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
