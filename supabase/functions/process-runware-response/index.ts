/**
 * Process Runware Response
 * Downloads completed Runware results and uploads them to Supabase storage
 * Fixes generations stuck in 'pending' with provider_response but no storage_path
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = new EdgeLogger('process-runware-response', crypto.randomUUID());

  try {
    const { generation_id } = await req.json();
    
    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: 'generation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Processing Runware response', { metadata: { generationId: generation_id } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get generation details
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generation_id)
      .single();

    if (genError || !generation) {
      logger.error('Generation not found', genError || new Error('Not found'));
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already processed
    if (generation.status === 'completed' && generation.storage_path) {
      logger.info('Already processed', { metadata: { generationId: generation_id } });
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Generation already completed',
          storage_path: generation.storage_path
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract image URL from provider_response
    const providerResponse = generation.provider_response as any;
    const imageURL = providerResponse?.data?.[0]?.imageURL;
    const videoURL = providerResponse?.data?.[0]?.videoURL;
    const audioURL = providerResponse?.data?.[0]?.audioURL;
    
    const mediaURL = imageURL || videoURL || audioURL;

    if (!mediaURL) {
      logger.error('No media URL in response', new Error('Missing URL'));
      return new Response(
        JSON.stringify({ 
          error: 'No media URL found in provider response',
          provider_response: providerResponse
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Found media URL', { metadata: { mediaURL } });

    // Download from Runware
    const downloadResponse = await fetch(mediaURL);
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download: ${downloadResponse.statusText}`);
    }

    const contentType = downloadResponse.headers.get('content-type') || 'image/png';
    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Determine file extension
    let extension = 'png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';
    else if (contentType.includes('webp')) extension = 'webp';
    else if (contentType.includes('mp4')) extension = 'mp4';
    else if (contentType.includes('mp3')) extension = 'mp3';
    else if (contentType.includes('wav')) extension = 'wav';

    // Generate storage path
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const randomStr = crypto.randomUUID().split('-')[0];
    const storagePath = `${generation.user_id}/${dateStr}/${randomStr}.${extension}`;

    logger.info('Uploading to storage', { metadata: { storagePath, size: buffer.length } });

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('generated-content')
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('generated-content')
      .getPublicUrl(storagePath);

    logger.info('Upload successful', { metadata: { publicURL: urlData.publicUrl } });

    // Update generation record
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        status: 'completed',
        storage_path: storagePath,
        output_url: urlData.publicUrl,
        file_size_bytes: buffer.length,
      })
      .eq('id', generation_id);

    if (updateError) {
      throw new Error(`Failed to update generation: ${updateError.message}`);
    }

    logger.info('Processing complete', { 
      metadata: { 
        generationId: generation_id,
        storagePath,
        fileSize: buffer.length 
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        generation_id,
        storage_path: storagePath,
        output_url: urlData.publicUrl,
        file_size: buffer.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logger.error('Processing failed', error);
    return new Response(
      JSON.stringify({ 
        error: 'Processing failed',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
