/**
 * Cron Job: Archive Old Data
 * 
 * This function should be scheduled to run weekly to move old data
 * from production tables to archive tables.
 * 
 * Schedule: Every Sunday at 2 AM UTC
 * pg_cron expression: 0 2 * * 0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

interface ArchivalResult {
  table: string;
  archivedCount: number;
  deletedCount: number;
  error?: string;
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('cron-archive-data', requestId);
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    logger.info('Starting data archival');

    const results: ArchivalResult[] = [];

    // Archive api_call_logs (older than 30 days)
    try {
      const { data: apiLogsResult, error: apiLogsError } = await supabase
        .rpc('archive_api_call_logs', { retention_days: 30 });
      
      if (apiLogsError) {
        results.push({ table: 'api_call_logs', archivedCount: 0, deletedCount: 0, error: apiLogsError.message });
      } else {
        results.push({ table: 'api_call_logs', archivedCount: apiLogsResult || 0, deletedCount: apiLogsResult || 0 });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      results.push({ table: 'api_call_logs', archivedCount: 0, deletedCount: 0, error: errorMessage });
    }

    // Archive audit_logs (older than 90 days)
    try {
      const { data: auditLogsResult, error: auditLogsError } = await supabase
        .rpc('archive_audit_logs', { retention_days: 90 });
      
      if (auditLogsError) {
        results.push({ table: 'audit_logs', archivedCount: 0, deletedCount: 0, error: auditLogsError.message });
      } else {
        results.push({ table: 'audit_logs', archivedCount: auditLogsResult || 0, deletedCount: auditLogsResult || 0 });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      results.push({ table: 'audit_logs', archivedCount: 0, deletedCount: 0, error: errorMessage });
    }

    // Archive generations (older than 180 days, only completed ones)
    try {
      const { data: generationsResult, error: generationsError } = await supabase
        .rpc('archive_generations', { retention_days: 180 });
      
      if (generationsError) {
        results.push({ table: 'generations', archivedCount: 0, deletedCount: 0, error: generationsError.message });
      } else {
        results.push({ table: 'generations', archivedCount: generationsResult || 0, deletedCount: generationsResult || 0 });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      results.push({ table: 'generations', archivedCount: 0, deletedCount: 0, error: errorMessage });
    }

    const duration = Date.now() - startTime;
    const totalArchived = results.reduce((sum, r) => sum + r.archivedCount, 0);
    const hasErrors = results.some(r => r.error);

    logger.info('Data archival completed', { 
      metadata: { 
        durationMs: duration,
        totalArchived,
        results,
        hasErrors
      } 
    });

    // Record the archival run
    await supabase.from('archival_runs').insert({
      api_call_logs_archived: results.find(r => r.table === 'api_call_logs')?.archivedCount || 0,
      audit_logs_archived: results.find(r => r.table === 'audit_logs')?.archivedCount || 0,
      generations_archived: results.find(r => r.table === 'generations')?.archivedCount || 0,
      status: hasErrors ? 'partial' : 'completed',
      error_message: hasErrors ? JSON.stringify(results.filter(r => r.error).map(r => ({ table: r.table, error: r.error }))) : null,
      completed_at: new Date().toISOString(),
    });

    // Record metric
    await supabase.rpc('record_metric', {
      p_name: 'archival_duration_ms',
      p_value: duration,
      p_unit: 'milliseconds',
      p_tags: { total_archived: totalArchived, has_errors: hasErrors }
    });

    return new Response(
      JSON.stringify({
        success: !hasErrors,
        message: hasErrors ? 'Archival completed with errors' : 'Archival completed successfully',
        totalArchived,
        durationMs: duration,
        results,
      }),
      { 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        status: hasErrors ? 207 : 200  // 207 Multi-Status for partial success
      }
    );

  } catch (error) {
    logger.error('Data archival failed', error as Error);
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
