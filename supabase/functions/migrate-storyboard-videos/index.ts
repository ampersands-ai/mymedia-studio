import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('migrate-storyboard-videos', requestId);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check admin role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { limit = 10, dryRun = false, skipExisting = true } = await req.json();

    logger.info('Starting migration', { metadata: { limit, dryRun, skipExisting } });

    // Query storyboards needing migration
    const query = supabaseClient
      .from('storyboards')
      .select('*')
      .eq('status', 'complete')
      .not('video_url', 'is', null)
      .ilike('video_url', '%json2video%')
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: storyboards, error: queryError } = await query;

    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`);
    }

    if (!storyboards || storyboards.length === 0) {
      return new Response(
        JSON.stringify({
          total: 0,
          processed: 0,
          failed: 0,
          expired: 0,
          skipped: 0,
          details: [],
          message: 'No storyboards found needing migration'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let failed = 0;
    let expired = 0;
    let skipped = 0;
    const details = [];

    for (const storyboard of storyboards) {
      const hasStoragePath = storyboard.video_storage_path && 
                            storyboard.video_storage_path.startsWith('storyboard-videos/');

      // Skip if already has valid storage path
      if (skipExisting && hasStoragePath) {
        skipped++;
        details.push({
          storyboardId: storyboard.id,
          topic: storyboard.topic,
          status: 'skipped',
          reason: 'Already has storage path',
        });
        continue;
      }

      if (dryRun) {
        details.push({
          storyboardId: storyboard.id,
          topic: storyboard.topic,
          status: 'preview',
          videoUrl: storyboard.video_url,
          userId: storyboard.user_id,
        });
        continue;
      }

      // Check if video URL is still accessible
      try {
        const checkResponse = await fetch(storyboard.video_url, { method: 'HEAD' });
        
        if (!checkResponse.ok) {
          expired++;
          
          // Mark as expired in database
          await supabaseClient
            .from('storyboards')
            .update({ status: 'expired' })
            .eq('id', storyboard.id);

          details.push({
            storyboardId: storyboard.id,
            topic: storyboard.topic,
            status: 'expired',
            error: `Video URL expired (HTTP ${checkResponse.status})`,
          });
          continue;
        }

        // Call download-storyboard-video function
        const payload = {
          storyboardId: storyboard.id,
          videoUrl: storyboard.video_url,
          userId: storyboard.user_id,
        };
        const downloadResult = await supabaseClient.functions.invoke('download-storyboard-video', {
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (downloadResult.error) {
          failed++;
          details.push({
            storyboardId: storyboard.id,
            topic: storyboard.topic,
            status: 'failed',
            error: downloadResult.error.message,
          });
        } else {
          processed++;
          details.push({
            storyboardId: storyboard.id,
            topic: storyboard.topic,
            status: 'success',
            storagePath: downloadResult.data.storagePath,
          });
        }

      } catch (error) {
        failed++;
        details.push({
          storyboardId: storyboard.id,
          topic: storyboard.topic,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const response = {
      total: storyboards.length,
      processed,
      failed,
      expired,
      skipped,
      details,
      message: dryRun 
        ? `Preview: ${storyboards.length} storyboards ready for migration`
        : `Migration complete: ${processed} succeeded, ${failed} failed, ${expired} expired, ${skipped} skipped`,
    };

    logger.info('Migration complete', { metadata: response });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Migration error', error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
