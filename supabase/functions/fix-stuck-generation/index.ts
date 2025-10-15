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
    const { generation_id, result_url, action } = await req.json();
    
    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: 'Missing generation_id' }),
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
      .maybeSingle();

    if (getError || !generation) {
      throw new Error('Generation not found');
    }

    // If action is 'fail', just mark as failed and refund
    if (action === 'fail' || !result_url) {
      console.log('Marking generation as failed and refunding tokens:', generation_id);
      
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'failed',
          provider_response: {
            error: 'Webhook processing failed. Tokens have been refunded.',
            fixed_at: new Date().toISOString()
          }
        })
        .eq('id', generation_id);

      if (updateError) {
        throw new Error(`Failed to update generation: ${updateError.message}`);
      }

      // Refund tokens
      await supabase.rpc('increment_tokens', {
        user_id_param: generation.user_id,
        amount: generation.tokens_used
      });

      console.log('Tokens refunded:', generation.tokens_used);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Generation marked as failed and tokens refunded',
          tokens_refunded: generation.tokens_used
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Downloading content from:', result_url);

    // Download the content
    const contentResponse = await fetch(result_url);
    if (!contentResponse.ok) {
      throw new Error(`Failed to download content: ${contentResponse.status}`);
    }

    const arrayBuffer = await contentResponse.arrayBuffer();
    const contentData = new Uint8Array(arrayBuffer);
    
    console.log('Downloaded. Size:', contentData.length, 'bytes');

    // Determine file extension and content type from URL and generation type
    const urlExt = result_url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] || '';
    
    const typeToMime: Record<string, string> = {
      'image': 'image/jpeg',
      'video': 'video/mp4',
      'audio': 'audio/mpeg',
      'text': 'text/plain'
    };
    
    const typeToExt: Record<string, string> = {
      'image': urlExt || 'jpg',
      'video': urlExt || 'mp4',
      'audio': urlExt || 'mp3',
      'text': urlExt || 'txt'
    };
    
    const contentType = typeToMime[generation.type] || 'application/octet-stream';
    const fileExtension = typeToExt[generation.type] || urlExt || 'bin';
    
    console.log('Detected type:', generation.type, 'Extension:', fileExtension, 'MIME:', contentType);

    // Upload to storage
    const date = new Date();
    const dateFolder = date.toISOString().split('T')[0];
    const storagePath = `${generation.user_id}/${dateFolder}/${generation.id}.${fileExtension}`;
    
    const { error: uploadError } = await supabase.storage
      .from('generated-content')
      .upload(storagePath, contentData, {
        contentType: contentType,
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
        file_size_bytes: contentData.length
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
