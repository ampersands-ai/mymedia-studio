import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const stemsParam = formData.get('stems') as string;

    if (!audioFile) {
      throw new Error('Audio file is required');
    }

    // Parse stems from JSON string
    const stems = stemsParam ? JSON.parse(stemsParam) : { vocals: true, drums: true, bass: true, other: true };

    console.log(`[StemSeparation] Processing file: ${audioFile.name}, size: ${audioFile.size}`);
    console.log(`[StemSeparation] Requested stems:`, stems);

    // Create form data for ElevenLabs API
    const apiFormData = new FormData();
    apiFormData.append('audio', audioFile);

    // Call ElevenLabs Audio Isolation API (extracts vocals)
    // Note: ElevenLabs has audio isolation, not full stem separation
    // For full stem separation, we'd need to use a different service like Demucs
    // This implementation uses audio isolation for vocals
    const response = await fetch(
      'https://api.elevenlabs.io/v1/audio-isolation',
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: apiFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[StemSeparation] ElevenLabs error: ${response.status} - ${errorText}`);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get audio as ArrayBuffer and encode to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log(`[StemSeparation] Successfully isolated vocals, output size: ${audioBuffer.byteLength}`);

    // Return the isolated vocals
    // In a full implementation, we'd run multiple passes or use Demucs for all stems
    return new Response(
      JSON.stringify({ 
        success: true, 
        stems: {
          vocals: stems.vocals ? base64Audio : null,
          // ElevenLabs audio isolation only provides vocals
          // Other stems would require additional processing
          drums: null,
          bass: null,
          other: null,
        },
        contentType: 'audio/mpeg',
        note: 'Audio isolation extracts vocals only. Full stem separation coming soon.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[StemSeparation] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
