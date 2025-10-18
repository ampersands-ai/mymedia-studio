import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Log ALL incoming requests for debugging webhook delivery issues
  console.log('=== WEBHOOK REQUEST RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight - responding with headers');
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

    const { state, resultJson, failMsg, video_url, consumeCredits, remainedCredits, costTime } = payload.data || {};
    
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

    // Extract Kie.ai callback type and items array
    const callbackType = payload.data?.callbackType || payload.data?.callback_type;
    const items = payload.data?.data || [];
    
    console.log('Callback type:', callbackType, 'Items count:', items.length);

    // Support both old format (state field) and new format (code field)
    const isSuccess = state === 'success' || payload.code === 200 || (payload.msg && payload.msg.toLowerCase().includes('success'));
    const isFailed = state === 'failed' || payload.status === 400 || payload.code === 400 || payload.code === 422 || (payload.msg && payload.msg.toLowerCase().includes('fail'));

    // Handle failure
    if (isFailed) {
      // Log detailed error server-side only
      console.error('KieAI generation failure details:', {
        task_id: taskId,
        fail_msg: failMsg,
        payload_msg: payload.msg,
        generation_id: generation.id,
        full_payload: JSON.stringify(payload, null, 2)
      });
      
      // Sanitize error message for database (no sensitive details)
      const sanitizedError = (failMsg || payload.msg || 'Generation failed').substring(0, 200);
      
      // Update generation to failed with sanitized error
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'failed',
          provider_response: {
            error: sanitizedError,
            error_type: 'provider_failure',
            kie_credits_consumed: consumeCredits || 0, // Should be 0 on failure
            kie_credits_remaining: remainedCredits || null,
            timestamp: new Date().toISOString()
          }
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

      // Insert audit record for failed generation
      const { error: auditError } = await supabase
        .from('kie_credit_audits')
        .insert({
          generation_id: generation.id,
          api_request_payload: generation.provider_request || {},
          api_request_sent_at: generation.created_at,
          api_callback_payload: payload,
          api_callback_received_at: new Date().toISOString(),
          kie_credits_consumed: consumeCredits || 0,
          kie_credits_remaining: remainedCredits,
          our_tokens_charged: generation.tokens_used,
          model_id: generation.model_id || 'unknown',
          task_status: 'failed',
          processing_time_seconds: 0
        });

      if (auditError) {
        console.error('Failed to insert credit audit (failure):', auditError);
        // Don't fail the webhook response, just log
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Generation marked as failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle partial callbacks (first, text) - update to processing but don't upload
    if (callbackType && callbackType.toLowerCase() !== 'complete') {
      console.log(`Received partial callback: ${callbackType} - updating to processing`);
      
      await supabase
        .from('generations')
        .update({ 
          status: 'processing', 
          provider_response: payload 
        })
        .eq('id', generation.id);

      return new Response(
        JSON.stringify({ success: true, message: `Partial webhook (${callbackType}) acknowledged` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle success (support multiple formats including Kie.ai items-based format)
    if (isSuccess && (resultJson || payload.data?.info || video_url || (Array.isArray(items) && items.length > 0))) {
      console.log('Processing successful generation');
      
      // Support multiple URL formats
      let resultUrls: string[] = [];
      
      if (video_url) {
        // Direct video_url field
        resultUrls = [video_url];
      } else if (resultJson) {
        // Old format: parse resultJson
        const result = JSON.parse(resultJson);
        resultUrls = result.resultUrls || [result.resultUrl].filter(Boolean);
      } else if (payload.data?.info) {
        // New format: use data.info
        resultUrls = payload.data.info.resultUrls || payload.data.info.result_urls || [];
      } else if (Array.isArray(items) && items.length > 0) {
        // Kie.ai items-based format - extract URLs based on generation type
        console.log('Processing Kie.ai items-based format for type:', generation.type);
        
        if (generation.type === 'audio') {
          // For audio: prefer audio_url, fallback to source_audio_url, then stream_audio_url
          resultUrls = items
            .map((item: any) => item?.audio_url || item?.source_audio_url || item?.stream_audio_url)
            .filter(Boolean);
          console.log('Extracted audio URLs:', resultUrls);
        } else if (generation.type === 'image') {
          // For images: prefer image_url, fallback to source_image_url
          resultUrls = items
            .map((item: any) => item?.image_url || item?.source_image_url)
            .filter(Boolean);
          console.log('Extracted image URLs:', resultUrls);
        } else {
          // For video/other: try multiple fields
          resultUrls = items
            .map((item: any) => item?.video_url || item?.source_video_url || item?.url)
            .filter(Boolean);
          console.log('Extracted video/other URLs:', resultUrls);
        }
      }

      if (resultUrls.length === 0) {
        console.error('No result URLs found. Payload keys:', Object.keys(payload.data || {}));
        console.error('Items sample:', items[0] ? Object.keys(items[0]) : 'No items');
        throw new Error('No result URLs found in response');
      }

      console.log(`Found ${resultUrls.length} output(s) to process`);

      // Process first output (update parent generation)
      const firstUrl = resultUrls[0];
      console.log('Downloading first result from:', firstUrl);

      const contentResponse = await fetch(firstUrl);
      if (!contentResponse.ok) {
        throw new Error(`Failed to download result: ${contentResponse.status}`);
      }

      const arrayBuffer = await contentResponse.arrayBuffer();
      const output_data = new Uint8Array(arrayBuffer);
      
      // Determine file extension
      const contentType = contentResponse.headers.get('content-type') || '';
      const fileExtension = determineFileExtension(contentType, firstUrl);
      
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

      // Update generation record to completed
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'completed',
          storage_path: storagePath,
          file_size_bytes: output_data.length,
          provider_response: {
            ...payload,
            // Extract key metrics for easy querying
            kie_credits_consumed: consumeCredits || null,
            kie_credits_remaining: remainedCredits || null,
            kie_processing_time_seconds: costTime || null,
            our_tokens_charged: generation.tokens_used, // For comparison
            timestamp: new Date().toISOString()
          },
          output_index: 0,
          is_batch_output: resultUrls.length > 1
        })
        .eq('id', generation.id);

      if (updateError) {
        console.error('Failed to update generation:', updateError);
        throw updateError;
      }

      console.log('Generation completed successfully:', generation.id);

      // Compare our token calculation with Kie's actual charges
      if (consumeCredits !== undefined && consumeCredits !== generation.tokens_used) {
        console.warn('Credit mismatch detected:', {
          generation_id: generation.id,
          our_tokens: generation.tokens_used,
          kie_credits: consumeCredits,
          difference: Math.abs(generation.tokens_used - consumeCredits)
        });
      }

      // Insert audit record for credit tracking
      const { error: auditError } = await supabase
        .from('kie_credit_audits')
        .insert({
          generation_id: generation.id,
          api_request_payload: generation.provider_request || {},
          api_request_sent_at: generation.created_at,
          api_callback_payload: payload,
          api_callback_received_at: new Date().toISOString(),
          kie_credits_consumed: consumeCredits || 0,
          kie_credits_remaining: remainedCredits,
          our_tokens_charged: generation.tokens_used,
          model_id: generation.model_id || 'unknown',
          task_status: 'success',
          processing_time_seconds: costTime
        });

      if (auditError) {
        console.error('Failed to insert credit audit (success):', auditError);
        // Don't fail the generation, just log
      }

      // Process additional outputs (2nd, 3rd, etc.)
      if (resultUrls.length > 1) {
        console.log(`Processing ${resultUrls.length - 1} additional output(s)`);
        
        for (let i = 1; i < resultUrls.length; i++) {
          try {
            const url = resultUrls[i];
            console.log(`Downloading output ${i + 1} from:`, url);

            const response = await fetch(url);
            if (!response.ok) {
              console.error(`Failed to download output ${i + 1}:`, response.status);
              continue;
            }

            const buffer = await response.arrayBuffer();
            const data = new Uint8Array(buffer);
            const type = response.headers.get('content-type') || '';
            const ext = determineFileExtension(type, url);

            // Create a unique ID for this child generation
            const childId = crypto.randomUUID();

            // Upload child output to storage
            const childStoragePath = await uploadToStorage(
              supabase,
              generation.user_id,
              childId,
              data,
              ext,
              generation.type
            );

            console.log(`Uploaded output ${i + 1} to storage:`, childStoragePath);

            // Create child generation record
            const { error: insertError } = await supabase
              .from('generations')
              .insert({
                id: childId,
                user_id: generation.user_id,
                type: generation.type,
                prompt: generation.prompt,
                enhanced_prompt: generation.enhanced_prompt,
                original_prompt: generation.original_prompt,
                model_id: generation.model_id,
                model_record_id: generation.model_record_id,
                template_id: generation.template_id,
                settings: generation.settings,
                tokens_used: 0, // Don't double-charge tokens
                status: 'completed',
                storage_path: childStoragePath,
                file_size_bytes: data.length,
                provider_task_id: generation.provider_task_id,
                provider_request: generation.provider_request,
                provider_response: payload,
                parent_generation_id: generation.id,
                output_index: i,
                is_batch_output: true
              });

            if (insertError) {
              console.error(`Failed to create child generation ${i + 1}:`, insertError);
            } else {
              console.log(`Child generation ${i + 1} created successfully:`, childId);
            }
          } catch (childError: any) {
            console.error(`Error processing output ${i + 1}:`, childError.message);
          }
        }
      }

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
          total_outputs: resultUrls.length,
          webhook_callback: true
        }
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Generation completed',
          outputs_processed: resultUrls.length
        }),
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
