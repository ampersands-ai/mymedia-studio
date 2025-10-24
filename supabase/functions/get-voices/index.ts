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

    // Return all voices with their native ElevenLabs preview URLs
    return new Response(
      JSON.stringify({ voices: data.voices }),
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
