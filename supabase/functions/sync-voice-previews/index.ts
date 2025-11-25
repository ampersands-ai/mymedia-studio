import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";
import { API_ENDPOINTS } from "../_shared/api-endpoints.ts";
import { toError } from "../_shared/error-utils.ts";



const TOP_VOICES = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill' },
];

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('sync-voice-previews', requestId);
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logger.info('Fetching voices from ElevenLabs');
    const voicesResponse = await fetch(`${API_ENDPOINTS.ELEVENLABS.fullUrl}/voices`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    });

    if (!voicesResponse.ok) {
      throw new Error(`ElevenLabs API error: ${voicesResponse.status}`);
    }

    const voicesData = await voicesResponse.json();
    const results: { voice_id: string; name: string; status: string; error?: string }[] = [];

    // Process top voices
    for (const topVoice of TOP_VOICES) {
      logger.info('Processing voice', { metadata: { voiceName: topVoice.name, voiceId: topVoice.id } });
      
      try {
        // Find the voice in the ElevenLabs response
        const voiceData = voicesData.voices?.find((v: { voice_id: string; preview_url?: string }) => v.voice_id === topVoice.id);
        if (!voiceData || !voiceData.preview_url) {
          results.push({
            voice_id: topVoice.id,
            name: topVoice.name,
            status: 'skipped',
            error: 'No preview URL found'
          });
          continue;
        }

        // Download the preview audio
        logger.info('Downloading preview', { metadata: { voiceName: topVoice.name, url: voiceData.preview_url } });
        const audioResponse = await fetch(voiceData.preview_url);
        
        if (!audioResponse.ok) {
          throw new Error(`Failed to download: ${audioResponse.status}`);
        }

        const audioBlob = await audioResponse.arrayBuffer();
        const audioFile = new Uint8Array(audioBlob);

        // Upload to Supabase Storage
        const filePath = `${topVoice.id}.mp3`;
        logger.info('Uploading to storage', { metadata: { voiceName: topVoice.name, filePath } });
        
        const { error: uploadError } = await supabase.storage
          .from('voice-previews')
          .upload(filePath, audioFile, {
            contentType: 'audio/mpeg',
            cacheControl: '31536000', // 1 year
            upsert: true // Overwrite if exists
          });

        if (uploadError) {
          throw uploadError;
        }

        results.push({
          voice_id: topVoice.id,
          name: topVoice.name,
          status: 'success'
        });

        logger.info('Voice uploaded successfully', { metadata: { voiceName: topVoice.name } });
      } catch (error) {
        const err = toError(error);
        logger.error('Failed to process voice', err, { metadata: { voiceName: topVoice.name } });
        results.push({
          voice_id: topVoice.id,
          name: topVoice.name,
          status: GENERATION_STATUS.FAILED,
          error: err.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === GENERATION_STATUS.FAILED).length;

    logger.info('Sync complete', { 
      metadata: { total: results.length, successful: successCount, failed: failedCount } 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failedCount
        },
        results 
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const err = toError(error);
    logger.error('Error in sync-voice-previews', err);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: err.message 
      }),
      { 
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
