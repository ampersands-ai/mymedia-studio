/**
 * Daily User Snapshots Edge Function
 * 
 * Scheduled to run daily at midnight UTC via pg_cron.
 * Computes and stores daily aggregates for each active user.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailySnapshot {
  user_id: string;
  snapshot_date: string;
  total_generations: number;
  successful_runs: number;
  failed_runs: number;
  pending_runs: number;
  cancelled_runs: number;
  credits_used: number;
  credits_refunded: number;
  credits_remaining_eod: number;
  images_generated: number;
  videos_generated: number;
  audio_generated: number;
  avg_generation_time_ms: number;
  total_processing_time_ms: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get yesterday's date (the day we're snapshotting)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const snapshotDate = yesterday.toISOString().split('T')[0];
    
    const startOfDay = `${snapshotDate}T00:00:00.000Z`;
    const endOfDay = `${snapshotDate}T23:59:59.999Z`;

    console.log(`[daily-user-snapshots] Computing snapshots for ${snapshotDate}`);

    // Get all generations from yesterday
    const { data: generations, error: genError } = await supabase
      .from('generations')
      .select('user_id, status, type, tokens_used, setup_duration_ms, api_duration_ms')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (genError) {
      throw new Error(`Failed to fetch generations: ${genError.message}`);
    }

    if (!generations || generations.length === 0) {
      console.log('[daily-user-snapshots] No generations found for yesterday');
      return new Response(
        JSON.stringify({ success: true, message: 'No generations to process', date: snapshotDate }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by user
    const userStats = new Map<string, {
      total: number;
      successful: number;
      failed: number;
      pending: number;
      cancelled: number;
      credits_used: number;
      images: number;
      videos: number;
      audio: number;
      total_time_ms: number;
    }>();

    for (const gen of generations) {
      const existing = userStats.get(gen.user_id) || {
        total: 0,
        successful: 0,
        failed: 0,
        pending: 0,
        cancelled: 0,
        credits_used: 0,
        images: 0,
        videos: 0,
        audio: 0,
        total_time_ms: 0,
      };

      existing.total++;
      existing.credits_used += gen.tokens_used || 0;
      existing.total_time_ms += (gen.setup_duration_ms || 0) + (gen.api_duration_ms || 0);

      if (gen.status === 'completed') existing.successful++;
      else if (gen.status === 'failed') existing.failed++;
      else if (gen.status === 'pending' || gen.status === 'processing') existing.pending++;
      else if (gen.status === 'cancelled') existing.cancelled++;

      if (gen.type === 'image') existing.images++;
      else if (gen.type === 'video') existing.videos++;
      else if (gen.type === 'audio') existing.audio++;

      userStats.set(gen.user_id, existing);
    }

    // Get current credit balances for all affected users
    const userIds = Array.from(userStats.keys());
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('user_id, tokens_remaining')
      .in('user_id', userIds);

    if (subError) {
      console.warn(`[daily-user-snapshots] Failed to fetch subscriptions: ${subError.message}`);
    }

    const balanceMap = new Map<string, number>();
    for (const sub of subscriptions || []) {
      balanceMap.set(sub.user_id, sub.tokens_remaining || 0);
    }

    // Build snapshot records
    const snapshots: DailySnapshot[] = [];
    for (const [userId, stats] of userStats) {
      snapshots.push({
        user_id: userId,
        snapshot_date: snapshotDate,
        total_generations: stats.total,
        successful_runs: stats.successful,
        failed_runs: stats.failed,
        pending_runs: stats.pending,
        cancelled_runs: stats.cancelled,
        credits_used: stats.credits_used,
        credits_refunded: 0, // Would need to track from audit logs
        credits_remaining_eod: balanceMap.get(userId) || 0,
        images_generated: stats.images,
        videos_generated: stats.videos,
        audio_generated: stats.audio,
        avg_generation_time_ms: stats.total > 0 ? Math.round(stats.total_time_ms / stats.total) : 0,
        total_processing_time_ms: stats.total_time_ms,
      });
    }

    // Upsert snapshots
    const { error: upsertError } = await supabase
      .from('user_daily_snapshots')
      .upsert(snapshots, {
        onConflict: 'user_id,snapshot_date',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      throw new Error(`Failed to upsert snapshots: ${upsertError.message}`);
    }

    console.log(`[daily-user-snapshots] Successfully created ${snapshots.length} snapshots for ${snapshotDate}`);

    // Log to audit
    await supabase.from('audit_logs').insert({
      action: 'daily_snapshots_computed',
      resource_type: 'user_daily_snapshots',
      metadata: {
        date: snapshotDate,
        users_processed: snapshots.length,
        total_generations: generations.length,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        date: snapshotDate,
        users_processed: snapshots.length,
        total_generations: generations.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[daily-user-snapshots] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
