import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    // Validate payload structure - support both camelCase and snake_case
    const taskId = payload.data?.taskId || payload.data?.task_id;
    if (!taskId) {
      console.error('Invalid payload: missing taskId/task_id');
      return new Response(
        JSON.stringify({ error: 'Missing taskId in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { state, resultJson, failMsg, video_url } = payload.data || {};
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Verify the task exists in our database before processing
    // This prevents malicious actors from sending fake webhook payloads
    const { data: generation, error: findError } = await supabase
      .from('generations')
      .select('*')
      .eq('provider_task_id', taskId)
      .single();

    if (findError || !generation) {
      console.error('Security: Rejected webhook for unknown task:', taskId, findError);
      return new Response(
        JSON.stringify({ error: 'Invalid task ID' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Additional security: Only accept webhooks for pending/processing generations
    if (generation.status !== 'pending' && generation.status !== 'processing') {
      console.error('Security: Rejected webhook for already processed task:', taskId, 'Status:', generation.status);
      return new Response(
        JSON.stringify({ error: 'Generation already processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Security: Valid webhook for generation:', generation.id);

    // Support both old format (state field) and new format (code field)
    const isSuccess = state === 'success' || payload.code === 200 || (payload.msg && payload.msg.toLowerCase().includes('success'));
    const isFailed = state === 'failed' || payload.status === 400 || payload.code === 400 || payload.code === 422 || (payload.msg && payload.msg.toLowerCase().includes('fail'));

    // Handle failure
    if (isFailed) {
      console.error('Generation failed:', failMsg || payload.msg);
      
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

    // Handle success (support multiple formats)
    if (isSuccess && (resultJson || payload.data?.info || video_url)) {
      console.log('Processing successful generation');
      
      // Support multiple URL formats
      let resultUrl: string | undefined;
      if (video_url) {
        // Direct video_url field
        resultUrl = video_url;
      } else if (resultJson) {
        // Old format: parse resultJson
        const result = JSON.parse(resultJson);
        resultUrl = result.resultUrls?.[0];
      } else if (payload.data?.info) {
        // New format: use data.info
        resultUrl = payload.data.info.resultUrls?.[0] || payload.data.info.result_urls?.[0];
      }

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

      // Update generation record to completed (no public URL needed, use storage_path for signed URLs)
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'completed',
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
    console.warn('Unknown webhook state - code:', payload.code, 'msg:', payload.msg);
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

async function uploadToStorage(
  supabase: SupabaseClient,
  userId: string,
  generationId: string,
  fileData: Uint8Array,
  fileExtension: string,
  contentType: string
): Promise<string> {
  // Create folder structure: {user_id}/{YYYY-MM-DD}/{generation_id}.ext
  const date = new Date();
  const dateFolder = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const fileName = `${generationId}.${fileExtension}`;
  const storagePath = `${userId}/${dateFolder}/${fileName}`;
  
  console.log('Uploading to storage:', storagePath, 'Size:', fileData.length);

  // Determine MIME type
  const mimeType = getMimeType(fileExtension, contentType);
  
  const { error: uploadError } = await supabase.storage
    .from('generated-content')
    .upload(storagePath, fileData, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw new Error(`Failed to upload to storage: ${uploadError.message}`);
  }

  return storagePath;
}

function getMimeType(extension: string, contentType: string): string {
  const extToMime: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'txt': 'text/plain'
  };

  const mimeFromExt = extToMime[extension.toLowerCase()];
  if (mimeFromExt) return mimeFromExt;

  if (contentType === 'image') return 'image/png';
  if (contentType === 'video') return 'video/mp4';
  if (contentType === 'audio') return 'audio/mpeg';
  if (contentType === 'text') return 'text/plain';

  return 'application/octet-stream';
}

function determineFileExtension(contentType: string, url: string): string {
  if (url) {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1];
  }
  
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
  
  return mimeToExt[contentType.toLowerCase()] || 'mp4';
}
