/**
 * Cron Job: Create Monthly Partitions
 * 
 * This function should be scheduled to run monthly to create
 * new partitions for the archive tables before they're needed.
 * 
 * Schedule: 1st of every month at 1 AM UTC
 * pg_cron expression: 0 1 1 * *
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('cron-create-partitions', requestId);
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    logger.info('Starting partition creation');

    // Get target month (2 months ahead to ensure we're always ready)
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 2);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1; // 1-indexed

    logger.info('Creating partitions for target month', { 
      metadata: { year: targetYear, month: targetMonth } 
    });

    // Call the database function to create partitions
    const { data, error } = await supabase
      .rpc('create_monthly_partitions', {
        target_year: targetYear,
        target_month: targetMonth
      });

    if (error) {
      throw new Error(`Partition creation failed: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    logger.info('Partition creation completed', { 
      metadata: { 
        durationMs: duration,
        targetYear,
        targetMonth
      } 
    });

    // Record metric
    await supabase.rpc('record_metric', {
      p_name: 'partition_creation_duration_ms',
      p_value: duration,
      p_unit: 'milliseconds',
      p_tags: { year: targetYear, month: targetMonth }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Partitions created for ${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
        durationMs: duration,
      }),
      { 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    logger.error('Partition creation failed', error as Error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
