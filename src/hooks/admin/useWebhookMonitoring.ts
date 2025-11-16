import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import type {
  WebhookStats,
  RecentWebhook,
  StorageFailure,
  ProviderStat,
  StuckGeneration
} from '@/types/admin/webhook-monitoring';

// Re-export types for backward compatibility
export type {
  WebhookStats,
  RecentWebhook,
  StorageFailure,
  ProviderStat,
  StuckGeneration
};

const fetchWebhookStats = async (): Promise<WebhookStats> => {
  const { data, error } = await supabase
    .from('generations')
    .select('status, created_at')
    .not('provider_task_id', 'is', null)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) throw error;

  const completedCount = data.filter(g => g.status === 'completed').length;
  const failedCount = data.filter(g => g.status === 'failed').length;
  const processingCount = data.filter(g => g.status === 'processing').length;
  const totalWebhooks = data.length;
  const successRate = totalWebhooks > 0 ? (completedCount / totalWebhooks) * 100 : 0;

  // Get storage failures
  const { data: storageFailData } = await supabase
    .from('generations')
    .select('id')
    .eq('status', 'failed')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .or('provider_response->>error.ilike.%storage%,provider_response->>storage_error.neq.null');

  // Get stuck generations
  const { data: stuckData } = await supabase
    .from('generations')
    .select('id')
    .eq('status', 'processing')
    .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

  return {
    successRate: Math.round(successRate),
    totalWebhooks,
    completedCount,
    failedCount,
    processingCount,
    storageFailures: storageFailData?.length || 0,
    stuckGenerations: stuckData?.length || 0,
    averageLatency: 850, // Mock value - could be calculated from api_call_logs
  };
};

const fetchRecentWebhooks = async (): Promise<RecentWebhook[]> => {
  const { data, error } = await supabase
    .from('generations')
    .select('id, created_at, status, model_id, storage_path, provider_response, tokens_used, provider_task_id, user_id')
    .not('provider_task_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as RecentWebhook[];
};

const fetchStorageFailures = async (): Promise<StorageFailure[]> => {
  const { data, error } = await supabase
    .from('generations')
    .select('id, created_at, model_id, provider_response, user_id')
    .eq('status', 'failed')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .or('provider_response->>error.ilike.%storage%,provider_response->>storage_error.neq.null')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(item => {
    const response = item.provider_response as Record<string, unknown> | null;
    const errorMsg = response?.error as string | undefined;
    const storageErr = response?.storage_error as string | undefined;
    
    return {
      id: item.id,
      created_at: item.created_at,
      model_id: item.model_id,
      error_message: errorMsg || 'Unknown error',
      storage_error: storageErr || errorMsg || '',
      user_id: item.user_id,
    };
  });
};

const fetchStuckGenerations = async (): Promise<StuckGeneration[]> => {
  const { data, error } = await supabase
    .from('generations')
    .select('id, created_at, status, model_id, user_id, provider_task_id, tokens_used')
    .eq('status', 'processing')
    .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const fetchProviderStats = async (): Promise<ProviderStat[]> => {
  const { data, error } = await supabase
    .from('generations')
    .select('model_id, status')
    .not('provider_task_id', 'is', null)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) throw error;

  const stats: Record<string, { success: number; fail: number }> = {};
  
  data.forEach(gen => {
    if (!stats[gen.model_id]) {
      stats[gen.model_id] = { success: 0, fail: 0 };
    }
    if (gen.status === 'completed') stats[gen.model_id].success++;
    if (gen.status === 'failed') stats[gen.model_id].fail++;
  });

  return Object.entries(stats).map(([model_id, counts]) => ({
    model_id,
    success_count: counts.success,
    fail_count: counts.fail,
    failure_rate: counts.success + counts.fail > 0 
      ? Math.round((counts.fail / (counts.success + counts.fail)) * 100) 
      : 0,
  })).sort((a, b) => b.failure_rate - a.failure_rate);
};

export const useWebhookMonitoring = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const stats = useQuery({
    queryKey: ['webhook-stats'],
    queryFn: fetchWebhookStats,
  });

  const recentWebhooks = useQuery({
    queryKey: ['recent-webhooks'],
    queryFn: fetchRecentWebhooks,
  });

  const storageFailures = useQuery({
    queryKey: ['storage-failures'],
    queryFn: fetchStorageFailures,
  });

  const stuckGenerations = useQuery({
    queryKey: ['stuck-generations'],
    queryFn: fetchStuckGenerations,
  });

  const providerStats = useQuery({
    queryKey: ['provider-stats'],
    queryFn: fetchProviderStats,
  });

  // Real-time subscription to generations table changes
  useEffect(() => {
    logger.debug('Setting up real-time webhook monitoring', {
      component: 'useWebhookMonitoring',
      operation: 'setupRealtime'
    });
    
    const channel = supabase
      .channel('webhook-monitor-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generations',
          filter: 'provider_task_id=not.is.null'
        },
        (payload) => {
          logger.debug('Webhook realtime event received', {
            component: 'useWebhookMonitoring',
            operation: 'realtimeEvent',
            eventType: payload.eventType,
            generationId: (payload.new as any)?.id
          });
          
          // Invalidate all queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['webhook-stats'] });
          queryClient.invalidateQueries({ queryKey: ['recent-webhooks'] });
          queryClient.invalidateQueries({ queryKey: ['storage-failures'] });
          queryClient.invalidateQueries({ queryKey: ['stuck-generations'] });
          queryClient.invalidateQueries({ queryKey: ['provider-stats'] });
          
          // Show toast for completed/failed generations
          if (payload.eventType === 'UPDATE') {
            const newRecord = payload.new as any;
            if (newRecord.status === 'completed') {
              toast({
                title: "✅ Webhook Completed",
                description: `Generation ${newRecord.id.slice(0, 8)}...`,
              });
            } else if (newRecord.status === 'failed') {
              toast({
                title: "❌ Webhook Failed",
                description: `Generation ${newRecord.id.slice(0, 8)}...`,
                variant: "destructive",
              });
            }
          }
        }
      )
      .subscribe((status) => {
        logger.debug('Realtime subscription status change', {
          component: 'useWebhookMonitoring',
          operation: 'subscriptionStatus',
          status
        });
      });

    return () => {
      logger.debug('Cleaning up realtime subscription', {
        component: 'useWebhookMonitoring',
        operation: 'cleanup'
      });
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  return {
    stats: stats.data,
    statsLoading: stats.isLoading,
    recentWebhooks: recentWebhooks.data || [],
    webhooksLoading: recentWebhooks.isLoading,
    storageFailures: storageFailures.data || [],
    stuckGenerations: stuckGenerations.data || [],
    providerStats: providerStats.data || [],
    refetchAll: () => {
      stats.refetch();
      recentWebhooks.refetch();
      storageFailures.refetch();
      stuckGenerations.refetch();
      providerStats.refetch();
    },
  };
};
