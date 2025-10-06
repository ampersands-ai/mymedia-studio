import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generation_id, result_url } = await req.json();
    
    if (!generation_id || !result_url) {
      return new Response(
        JSON.stringify({ error: 'Missing generation_id or result_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get generation details
    const { data: generation, error: getError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generation_id)
      .single();

    if (getError || !generation) {
      throw new Error('Generation not found');
    }

    console.log('Downloading video from:', result_url);

    // Download the video
    const videoResponse = await fetch(result_url);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const arrayBuffer = await videoResponse.arrayBuffer();
    const videoData = new Uint8Array(arrayBuffer);
    
    console.log('Downloaded. Size:', videoData.length, 'bytes');

    // Upload to storage
    const date = new Date();
    const dateFolder = date.toISOString().split('T')[0];
    const storagePath = `${generation.user_id}/${dateFolder}/${generation.id}.mp4`;
    
    const { error: uploadError } = await supabase.storage
      .from('generated-content')
      .upload(storagePath, videoData, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('Uploaded to storage:', storagePath);

    // Update generation to completed
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        status: 'completed',
        storage_path: storagePath,
        file_size_bytes: videoData.length
      })
      .eq('id', generation_id);

    if (updateError) {
      throw new Error(`Failed to update generation: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Generation fixed successfully',
        storage_path: storagePath 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Fix generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
