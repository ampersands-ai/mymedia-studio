/**
 * useUserDailySnapshots Hook
 * 
 * Fetches daily user snapshots for admin dashboard.
 * Provides user selection, date range filtering, and aggregation.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

export interface UserDailySnapshot {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export interface UserSummary {
  user_id: string;
  email: string | null;
  display_name: string | null;
  total_generations: number;
  successful_runs: number;
  failed_runs: number;
  credits_used: number;
  credits_remaining: number;
  last_activity: string | null;
  success_rate: number;
}

interface UseUserDailySnapshotsOptions {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}

export function useUserDailySnapshots(options: UseUserDailySnapshotsOptions = {}) {
  const { userId, dateFrom, dateTo, enabled = true } = options;

  const fetchSnapshots = useCallback(async () => {
    let query = supabase
      .from('user_daily_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (dateFrom) {
      query = query.gte('snapshot_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('snapshot_date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []) as UserDailySnapshot[];
  }, [userId, dateFrom, dateTo]);

  return useQuery({
    queryKey: ['user-daily-snapshots', userId, dateFrom, dateTo],
    queryFn: fetchSnapshots,
    enabled,
    staleTime: 60000, // 1 minute
  });
}

// Hook to get real-time user summaries from generations table
export function useUserSummaries(searchTerm?: string) {
  const fetchSummaries = useCallback(async () => {
    // Get all users with their generation stats
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        display_name,
        last_activity_at,
        user_subscriptions (
          tokens_remaining
        )
      `)
      .order('last_activity_at', { ascending: false, nullsFirst: false })
      .limit(500);

    if (profilesError) {
      throw profilesError;
    }

    // Get generation stats per user
    const { data: genStats, error: genError } = await supabase
      .from('generations')
      .select('user_id, status, tokens_used');

    if (genError) {
      throw genError;
    }

    // Aggregate stats per user
    const statsMap = new Map<string, {
      total: number;
      successful: number;
      failed: number;
      credits_used: number;
    }>();

    for (const gen of genStats || []) {
      const existing = statsMap.get(gen.user_id) || {
        total: 0,
        successful: 0,
        failed: 0,
        credits_used: 0,
      };

      existing.total++;
      if (gen.status === 'completed') {
        existing.successful++;
      } else if (gen.status === 'failed') {
        existing.failed++;
      }
      existing.credits_used += gen.tokens_used || 0;

      statsMap.set(gen.user_id, existing);
    }

    // Build summaries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summaries: UserSummary[] = (profiles || []).map((p: any) => {
      const stats = statsMap.get(p.id) || {
        total: 0,
        successful: 0,
        failed: 0,
        credits_used: 0,
      };

      const successRate = stats.total > 0 
        ? (stats.successful / stats.total) * 100 
        : 0;

      const subs = p.user_subscriptions as Array<{ tokens_remaining?: number }> | null;
      return {
        user_id: p.id,
        email: p.email,
        display_name: p.display_name,
        total_generations: stats.total,
        successful_runs: stats.successful,
        failed_runs: stats.failed,
        credits_used: stats.credits_used,
        credits_remaining: subs?.[0]?.tokens_remaining || 0,
        last_activity: p.last_activity_at,
        success_rate: Math.round(successRate * 10) / 10,
      };
    });

    // Filter by search term if provided
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return summaries.filter(
        (s) =>
          s.email?.toLowerCase().includes(term) ||
          s.display_name?.toLowerCase().includes(term)
      );
    }

    return summaries;
  }, [searchTerm]);

  return useQuery({
    queryKey: ['user-summaries', searchTerm],
    queryFn: fetchSummaries,
    staleTime: 30000, // 30 seconds
  });
}

// Hook to get daily generation stats for a specific user (real-time calculation)
export function useUserDailyStats(userId: string) {
  const fetchDailyStats = useCallback(async () => {
    const { data, error } = await supabase
      .from('generations')
      .select('created_at, status, type, tokens_used, setup_duration_ms, api_duration_ms')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Group by date
    const dailyMap = new Map<string, {
      date: string;
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

    for (const gen of data || []) {
      const date = gen.created_at.split('T')[0];
      const existing = dailyMap.get(date) || {
        date,
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

      dailyMap.set(date, existing);
    }

    return Array.from(dailyMap.values());
  }, [userId]);

  return useQuery({
    queryKey: ['user-daily-stats', userId],
    queryFn: fetchDailyStats,
    enabled: !!userId,
    staleTime: 30000,
  });
}
