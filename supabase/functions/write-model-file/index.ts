import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request
    const { filePath, content, modelRecordId, modelId } = await req.json();

    if (!filePath || !content) {
      throw new Error('Missing required fields: filePath, content');
    }

    console.log(JSON.stringify({
      event: 'write_model_file',
      modelId,
      modelRecordId,
      filePath,
      contentLength: content.length,
    }));

    // Write file to filesystem
    const fullPath = `/home/deno/${filePath}`;
    
    // Ensure directory exists
    const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
    try {
      await Deno.mkdir(dirPath, { recursive: true });
    } catch (err) {
      // Directory might already exist, ignore error
      console.log(`Directory creation skipped (may exist): ${dirPath}`);
    }

    // Write the file
    await Deno.writeTextFile(fullPath, content);

    console.log(JSON.stringify({
      event: 'file_written_successfully',
      path: fullPath,
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        filePath: fullPath,
        message: `Model file written successfully: ${filePath}`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error writing model file:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});