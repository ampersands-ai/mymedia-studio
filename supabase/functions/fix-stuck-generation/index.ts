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
    // SECURITY: Authenticate admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated and is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { generation_id, generationId, result_url, result_urls, action, forceTerminate } = await req.json();
    
    const genId = generation_id || generationId;
    
    if (!genId) {
      return new Response(
        JSON.stringify({ error: 'Missing generation_id or generationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get generation details
    const { data: generation, error: getError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', genId)
      .maybeSingle();

    if (getError || !generation) {
      throw new Error('Generation not found');
    }

    // Support both single result_url and multiple result_urls
    const urls = result_urls || (result_url ? [result_url] : []);

    // If action is 'fail' or forceTerminate, just mark as failed and refund
    if (action === 'fail' || forceTerminate || urls.length === 0) {
      console.log('Terminating generation and refunding tokens:', genId);
      
      const errorMessage = forceTerminate 
        ? 'Generation manually terminated by admin. Tokens have been refunded.'
        : 'Webhook processing failed. Tokens have been refunded.';
        
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'failed',
          provider_response: {
            error: errorMessage,
            terminated_by: forceTerminate ? user.id : null,
            fixed_at: new Date().toISOString()
          }
        })
        .eq('id', genId);

      if (updateError) {
        throw new Error(`Failed to update generation: ${updateError.message}`);
      }

      // Refund tokens
      await supabase.rpc('increment_tokens', {
        user_id_param: generation.user_id,
        amount: generation.tokens_used
      });

      console.log('Tokens refunded:', generation.tokens_used);

      // Log termination to audit
      if (forceTerminate) {
        await supabase
          .from('audit_logs')
          .insert({
            user_id: user.id,
            action: 'generation_terminated',
            resource_type: 'generation',
            resource_id: genId,
            metadata: {
              user_id: generation.user_id,
              tokens_refunded: generation.tokens_used,
              model_id: generation.model_id,
              type: generation.type
            }
          });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: forceTerminate ? 'Generation terminated successfully and tokens refunded' : 'Generation marked as failed and tokens refunded',
          tokens_refunded: generation.tokens_used
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing', urls.length, 'output URL(s)');

    // Helper functions
    const determineFileExtension = (url: string, type: string): string => {
      const urlExt = url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] || '';
      const typeToExt: Record<string, string> = {
        'image': urlExt || 'jpg',
        'video': urlExt || 'mp4',
        'audio': urlExt || 'mp3',
        'text': urlExt || 'txt'
      };
      return typeToExt[type] || urlExt || 'bin';
    };

    const getMimeType = (type: string): string => {
      const typeToMime: Record<string, string> = {
        'image': 'image/jpeg',
        'video': 'video/mp4',
        'audio': 'audio/mpeg',
        'text': 'text/plain'
      };
      return typeToMime[type] || 'application/octet-stream';
    };

    const uploadToStorage = async (
      userId: string,
      generationId: string,
      data: Uint8Array,
      ext: string,
      type: string
    ): Promise<string> => {
      const date = new Date();
      const dateFolder = date.toISOString().split('T')[0];
      const storagePath = `${userId}/${dateFolder}/${generationId}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(storagePath, data, {
          contentType: getMimeType(type),
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      return storagePath;
    };

    const isMultiOutput = urls.length > 1;
    let mainStoragePath: string | null = null;
    let mainFileSize = 0;

    if (isMultiOutput) {
      console.log('Multi-output generation - creating child records for all URLs');
      
      // Create child generations for each URL
      for (let i = 0; i < urls.length; i++) {
        try {
          const url = urls[i];
          console.log(`[Output ${i + 1}/${urls.length}] Downloading from:`, url);

          const response = await fetch(url);
          if (!response.ok) {
            console.error(`[Output ${i + 1}] Download failed:`, response.status);
            continue;
          }

          const buffer = await response.arrayBuffer();
          const data = new Uint8Array(buffer);
          const ext = determineFileExtension(url, generation.type);

          console.log(`[Output ${i + 1}] Downloaded ${data.length} bytes, extension: ${ext}`);

          // Create unique child ID
          const childId = crypto.randomUUID();

          // Upload to storage
          const storagePath = await uploadToStorage(
            generation.user_id,
            childId,
            data,
            ext,
            generation.type
          );

          console.log(`[Output ${i + 1}] Uploaded to:`, storagePath);

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
              tokens_used: 0,
              status: 'completed',
              storage_path: storagePath,
              file_size_bytes: data.length,
              provider_task_id: generation.provider_task_id,
              provider_request: generation.provider_request,
              parent_generation_id: generation.id,
              output_index: i,
              is_batch_output: true
            });

          if (insertError) {
            console.error(`[Output ${i + 1}] Failed to create child:`, insertError);
          } else {
            console.log(`[Output ${i + 1}] Child generation created successfully`);
          }
        } catch (error: any) {
          console.error(`[Output ${i + 1}] Error:`, error.message);
        }
      }

      // Update parent to completed (container only, no storage_path)
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'completed',
          is_batch_output: true,
          output_index: 0
        })
        .eq('id', genId);

      if (updateError) {
        throw new Error(`Failed to update parent generation: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Generation fixed successfully - ${urls.length} outputs created`,
          total_outputs: urls.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Single output - process as before
      const url = urls[0];
      console.log('Single output - downloading from:', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download content: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const data = new Uint8Array(buffer);
      const ext = determineFileExtension(url, generation.type);
      
      console.log('Downloaded. Size:', data.length, 'bytes, Extension:', ext);

      // Upload to storage
      mainStoragePath = await uploadToStorage(
        generation.user_id,
        generation.id,
        data,
        ext,
        generation.type
      );

      console.log('Uploaded to storage:', mainStoragePath);

      // Update generation to completed
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'completed',
          storage_path: mainStoragePath,
          file_size_bytes: data.length
        })
        .eq('id', genId);

      if (updateError) {
        throw new Error(`Failed to update generation: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Generation fixed successfully',
          storage_path: mainStoragePath 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Fix generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
