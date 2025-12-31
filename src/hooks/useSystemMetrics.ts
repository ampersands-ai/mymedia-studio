/**
 * Hook for fetching system metrics for the monitoring dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemMetrics {
  database: {
    totalGenerations: number;
    activeGenerations: number;
    failedGenerations24h: number;
    avgGenerationTime: number;
  };
  users: {
    totalUsers: number;
    activeUsers24h: number;
    newUsers7d: number;
    premiumUsers: number;
  };
  storage: {
    totalSizeBytes: number;
    objectCount: number;
  };
  performance: {
    avgApiLatency: number;
    errorRate24h: number;
    successRate24h: number;
  };
}

export interface RateLimitMetrics {
  totalBlocked24h: number;
  topBlockedActions: Array<{ action: string; count: number }>;
  currentlyBlocked: number;
}

export interface ErrorMetrics {
  totalErrors24h: number;
  criticalErrors24h: number;
  errorsByCategory: Array<{ category: string; count: number }>;
  recentErrors: Array<{
    id: string;
    message: string;
    severity: string;
    created_at: string;
    category: string;
  }>;
}

export function useSystemMetrics() {
  return useQuery({
    queryKey: ['system-metrics'],
    queryFn: async (): Promise<SystemMetrics> => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        generationsResult,
        activeGenerationsResult,
        failedGenerationsResult,
        usersResult,
        activeUsersResult,
        newUsersResult,
        premiumUsersResult,
        apiLogsResult,
      ] = await Promise.all([
        supabase.from('generations').select('id', { count: 'exact', head: true }),
        supabase.from('generations').select('id', { count: 'exact', head: true }).in('status', ['PENDING', 'GENERATING', 'PROCESSING']),
        supabase.from('generations').select('id', { count: 'exact', head: true }).eq('status', 'FAILED').gte('created_at', yesterday.toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_activity_at', yesterday.toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', lastWeek.toISOString()),
        supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).neq('plan', 'freemium'),
        supabase.from('api_call_logs').select('latency_ms, is_error').gte('created_at', yesterday.toISOString()).limit(1000),
      ]);

      const apiLogs = apiLogsResult.data || [];
      const totalApiCalls = apiLogs.length;
      const errorCalls = apiLogs.filter((l: { is_error: boolean | null }) => l.is_error).length;
      const avgLatency = apiLogs.length > 0
        ? apiLogs.reduce((sum: number, l: { latency_ms: number | null }) => sum + (l.latency_ms || 0), 0) / apiLogs.length
        : 0;

      return {
        database: {
          totalGenerations: generationsResult.count || 0,
          activeGenerations: activeGenerationsResult.count || 0,
          failedGenerations24h: failedGenerationsResult.count || 0,
          avgGenerationTime: 0,
        },
        users: {
          totalUsers: usersResult.count || 0,
          activeUsers24h: activeUsersResult.count || 0,
          newUsers7d: newUsersResult.count || 0,
          premiumUsers: premiumUsersResult.count || 0,
        },
        storage: { totalSizeBytes: 0, objectCount: 0 },
        performance: {
          avgApiLatency: Math.round(avgLatency),
          errorRate24h: totalApiCalls > 0 ? (errorCalls / totalApiCalls) * 100 : 0,
          successRate24h: totalApiCalls > 0 ? ((totalApiCalls - errorCalls) / totalApiCalls) * 100 : 100,
        },
      };
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useRateLimitMetrics() {
  return useQuery({
    queryKey: ['rate-limit-metrics'],
    queryFn: async (): Promise<RateLimitMetrics> => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [blockedResult, currentlyBlockedResult] = await Promise.all([
        supabase.from('rate_limits').select('action, blocked_until').not('blocked_until', 'is', null).gte('last_attempt_at', yesterday.toISOString()),
        supabase.from('rate_limits').select('id', { count: 'exact', head: true }).gt('blocked_until', new Date().toISOString()),
      ]);

      const actionCounts: Record<string, number> = {};
      (blockedResult.data || []).forEach((r: { action: string }) => {
        actionCounts[r.action] = (actionCounts[r.action] || 0) + 1;
      });

      const topBlockedActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalBlocked24h: blockedResult.data?.length || 0,
        topBlockedActions,
        currentlyBlocked: currentlyBlockedResult.count || 0,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useErrorMetrics() {
  return useQuery({
    queryKey: ['error-metrics'],
    queryFn: async (): Promise<ErrorMetrics> => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [totalResult, criticalResult, byCategoryResult, recentResult] = await Promise.all([
        supabase.from('error_events').select('id', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()),
        supabase.from('error_events').select('id', { count: 'exact', head: true }).eq('severity', 'critical').gte('created_at', yesterday.toISOString()),
        supabase.from('error_events').select('category').gte('created_at', yesterday.toISOString()),
        supabase.from('error_events').select('id, message, severity, created_at, category').order('created_at', { ascending: false }).limit(10),
      ]);

      const categoryCounts: Record<string, number> = {};
      (byCategoryResult.data || []).forEach((r: { category: string }) => {
        categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
      });

      const errorsByCategory = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      return {
        totalErrors24h: totalResult.count || 0,
        criticalErrors24h: criticalResult.count || 0,
        errorsByCategory,
        recentErrors: recentResult.data || [],
      };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
