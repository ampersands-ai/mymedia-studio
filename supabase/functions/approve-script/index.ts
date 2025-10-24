import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, edited_script } = await req.json();

    if (!job_id) {
      throw new Error('job_id is required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch job and verify ownership
    const { data: job, error: fetchError } = await supabaseClient
      .from('video_jobs')
      .select('*')
      .eq('id', job_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !job) {
      throw new Error('Job not found or access denied');
    }

    if (job.status !== 'awaiting_script_approval') {
      throw new Error(`Job is in ${job.status} status, expected awaiting_script_approval`);
    }

    const finalScript = edited_script || job.script;
    if (!finalScript) {
      throw new Error('No script available');
    }

    console.log(`[${job_id}] Script approved, generating voiceover...`);

    // Update status to generating_voice
    await supabaseClient
      .from('video_jobs')
      .update({ 
        status: 'generating_voice',
        script: finalScript,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id);

    // Generate voiceover
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const voiceResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${job.voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: finalScript,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!voiceResponse.ok) {
      const errorText = await voiceResponse.text();
      throw new Error(`ElevenLabs API error: ${errorText}`);
    }

    const audioBlob = await voiceResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    // Upload voiceover to storage
    const voiceFileName = `${job_id}_voiceover.mp3`;
    const { error: uploadError } = await supabaseClient.storage
      .from('video-assets')
      .upload(voiceFileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload voiceover: ${uploadError.message}`);
    }

    const voiceoverPath = `video-assets/${voiceFileName}`;

    // Update job with voiceover URL and new status
    await supabaseClient
      .from('video_jobs')
      .update({
        voiceover_url: voiceoverPath,
        status: 'awaiting_voice_approval',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job_id);

    console.log(`[${job_id}] Voiceover generated, awaiting approval`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Voiceover generated successfully',
        status: 'awaiting_voice_approval'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('approve-script error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});