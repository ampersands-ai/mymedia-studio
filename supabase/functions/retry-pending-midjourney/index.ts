import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { GENERATION_STATUS } from "../_shared/constants.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('retry-pending-midjourney', requestId);

  try {
    // SECURITY: Authenticate admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
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
        { status: 403, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Scanning for pending Midjourney generations');

    // Find all pending/processing Midjourney generations
    const { data: pendingGens, error: queryError } = await supabase
      .from('generations')
      .select('id, model_id, provider_task_id, created_at, user_id, model_record_id')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(50); // Process max 50 at a time

    if (queryError) {
      throw new Error(`Failed to query generations: ${queryError.message}`);
    }

    if (!pendingGens || pendingGens.length === 0) {
      logger.info('No pending generations found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending generations found',
          processed: 0 
        }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter for Midjourney models
    const midjourneyGens = pendingGens.filter(gen => {
      const modelId = gen.model_id || '';
      return modelId && (modelId.startsWith('mj_') || modelId.includes('midjourney'));
    });

    logger.info('Found pending generations', { metadata: { totalPending: pendingGens.length, midjourneyCount: midjourneyGens.length } });

    if (midjourneyGens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending Midjourney generations found',
          total_pending: pendingGens.length,
          midjourney_pending: 0
        }),
        { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      total: midjourneyGens.length,
      processed: 0,
      completed: 0,
      still_processing: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Process each Midjourney generation
    for (const gen of midjourneyGens) {
      try {
        logger.info('Processing Midjourney generation', { 
          metadata: { 
            generationId: gen.id,
            modelId: gen.model_id,
            taskId: gen.provider_task_id || 'missing',
            createdAt: gen.created_at
          }
        });

        if (!gen.provider_task_id) {
          logger.warn('Skipping generation - no provider_task_id', { metadata: { generationId: gen.id } });
          results.errors.push({
            generation_id: gen.id,
            error: 'No provider_task_id found'
          });
          continue;
        }

        // Call poll-kie-status to check and fix if complete
        const pollResponse = await fetch(`${supabaseUrl}/functions/v1/poll-kie-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            generation_id: gen.id
          })
        });

        const pollResult = await pollResponse.json();
        results.processed++;

        if (pollResult.success) {
          if (pollResult.status === GENERATION_STATUS.COMPLETED && pollResult.result_urls?.length > 0) {
            logger.info('Task completed', { metadata: { generationId: gen.id, resultCount: pollResult.result_urls.length } });
            results.completed++;
          } else {
            logger.info('Task still processing', { metadata: { generationId: gen.id, status: pollResult.status } });
            results.still_processing++;
          }
        } else {
          logger.error('Poll failed', new Error(pollResult.error), { metadata: { generationId: gen.id } });
          results.failed++;
          results.errors.push({
            generation_id: gen.id,
            error: pollResult.error
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        logger.error('Processing error', error, { metadata: { generationId: gen.id } });
        results.failed++;
        results.errors.push({
          generation_id: gen.id,
          error: error.message
        });
      }
    }

    logger.info('Processing complete', { 
      metadata: { 
        totalProcessed: results.processed,
        completed: results.completed,
        stillProcessing: results.still_processing,
        failed: results.failed
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.processed} Midjourney generations`,
        results
      }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logger.error('Retry pending Midjourney error', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
