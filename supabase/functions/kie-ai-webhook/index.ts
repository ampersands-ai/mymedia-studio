import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { uploadToStorage } from "../generate-content/utils/storage.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Kie.ai webhook received');
    
    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload));

    // Validate payload structure
    if (!payload.data?.taskId) {
      console.error('Invalid payload: missing taskId');
      return new Response(
        JSON.stringify({ error: 'Missing taskId in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { taskId, state, resultJson, failMsg } = payload.data;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the generation record by provider_task_id
    const { data: generation, error: findError } = await supabase
      .from('generations')
      .select('*')
      .eq('provider_task_id', taskId)
      .single();

    if (findError || !generation) {
      console.error('Generation not found for taskId:', taskId);
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found generation:', generation.id);

    // Handle failure
    if (state === 'failed' || payload.status === 400) {
      console.error('Generation failed:', failMsg);
      
      // Update generation to failed and refund tokens
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'failed',
          provider_response: payload
        })
        .eq('id', generation.id);

      if (updateError) {
        console.error('Failed to update generation:', updateError);
      }

      // Refund tokens
      await supabase.rpc('increment_tokens', {
        user_id_param: generation.user_id,
        amount: generation.tokens_used
      });

      console.log('Tokens refunded:', generation.tokens_used);

      return new Response(
        JSON.stringify({ success: true, message: 'Generation marked as failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle success
    if (state === 'success' && resultJson) {
      console.log('Processing successful generation');
      
      const result = JSON.parse(resultJson);
      const resultUrl = result.resultUrls?.[0];

      if (!resultUrl) {
        throw new Error('No result URL found in response');
      }

      console.log('Downloading result from:', resultUrl);

      // Download the generated content
      const contentResponse = await fetch(resultUrl);
      if (!contentResponse.ok) {
        throw new Error(`Failed to download result: ${contentResponse.status}`);
      }

      const arrayBuffer = await contentResponse.arrayBuffer();
      const output_data = new Uint8Array(arrayBuffer);
      
      // Determine file extension
      const contentType = contentResponse.headers.get('content-type') || '';
      const fileExtension = determineFileExtension(contentType, resultUrl);
      
      console.log('Downloaded successfully. Size:', output_data.length, 'Extension:', fileExtension);

      // Upload to storage
      const storagePath = await uploadToStorage(
        supabase,
        generation.user_id,
        generation.id,
        output_data,
        fileExtension,
        generation.type
      );

      console.log('Uploaded to storage:', storagePath);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('generated-content')
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;
      console.log('Public URL:', publicUrl);

      // Update generation record to completed
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'completed',
          output_url: publicUrl,
          storage_path: storagePath,
          file_size_bytes: output_data.length,
          provider_response: payload
        })
        .eq('id', generation.id);

      if (updateError) {
        console.error('Failed to update generation:', updateError);
        throw updateError;
      }

      console.log('Generation completed successfully:', generation.id);

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: generation.user_id,
        action: 'generation_completed',
        resource_type: 'generation',
        resource_id: generation.id,
        metadata: {
          model_id: generation.model_id,
          tokens_used: generation.tokens_used,
          file_size: output_data.length,
          webhook_callback: true
        }
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Generation completed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown state
    console.warn('Unknown state:', state);
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received but state unknown' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function determineFileExtension(contentType: string, url: string): string {
  // Try to get extension from URL first
  if (url) {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1];
  }
  
  // Fallback to content type mapping
  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'text/plain': 'txt'
  };
  
  return mimeToExt[contentType.toLowerCase()] || 'mp4'; // Default to mp4 for videos
}
