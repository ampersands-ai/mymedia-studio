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
    const voiceId = formData.get('voice_id') as string;
    const modelId = formData.get('model_id') as string || 'eleven_english_sts_v2';

    if (!audioFile) {
      throw new Error('Audio file is required');
    }

    if (!voiceId) {
      throw new Error('Voice ID is required');
    }

    console.log(`[VoiceChanger] Processing file: ${audioFile.name}, size: ${audioFile.size}, voiceId: ${voiceId}`);

    // Create form data for ElevenLabs API
    const apiFormData = new FormData();
    apiFormData.append('audio', audioFile);
    apiFormData.append('model_id', modelId);

    // Call ElevenLabs Speech-to-Speech API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`,
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
      console.error(`[VoiceChanger] ElevenLabs error: ${response.status} - ${errorText}`);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get audio as ArrayBuffer and encode to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log(`[VoiceChanger] Successfully converted voice, output size: ${audioBuffer.byteLength}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        audioContent: base64Audio,
        contentType: 'audio/mpeg'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VoiceChanger] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
