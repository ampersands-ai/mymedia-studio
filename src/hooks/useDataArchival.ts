/**
 * Hook for managing data archival operations
 * Note: Archive functions are in the 'archive' schema, so we use direct queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ArchivalRun {
  id: string;
  table_name: string;
  archived_count: number;
  deleted_count: number;
  run_at: string;
  duration_ms: number | null;
  error_message: string | null;
}

export interface ArchivalStats {
  api_call_logs: { archived: number; pending: number };
  audit_logs: { archived: number; pending: number };
  generations: { archived: number; pending: number };
  lastRun: string | null;
}

export function useArchivalHistory(_limit: number = 20) {
  return useQuery({
    queryKey: ['archival-history', _limit],
    queryFn: async (): Promise<ArchivalRun[]> => {
      // Archive schema functions aren't in generated types
      // Return empty array as placeholder - actual data comes from admin edge function
      return [];
    },
    staleTime: 60000,
  });
}

export function useArchivalStats() {
  return useQuery({
    queryKey: ['archival-stats'],
    queryFn: async (): Promise<ArchivalStats> => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      const [apiLogsPending, auditLogsPending, generationsPending] = await Promise.all([
        supabase
          .from('api_call_logs')
          .select('id')
          .lt('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('audit_logs')
          .select('id')
          .lt('created_at', ninetyDaysAgo.toISOString()),
        supabase
          .from('generations')
          .select('id')
          .lt('created_at', oneEightyDaysAgo.toISOString())
          .in('status', ['completed', 'COMPLETED', 'failed', 'FAILED']),
      ]);

      return {
        api_call_logs: {
          archived: 0,
          pending: apiLogsPending.data?.length || 0,
        },
        audit_logs: {
          archived: 0,
          pending: auditLogsPending.data?.length || 0,
        },
        generations: {
          archived: 0,
          pending: generationsPending.data?.length || 0,
        },
        lastRun: null,
      };
    },
    staleTime: 300000,
  });
}

export function useRunArchival() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Call the archive function via edge function or admin API
      const { data, error } = await supabase.functions.invoke('admin-archival', {
        body: { action: 'run_archival' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Data archival completed successfully');
      queryClient.invalidateQueries({ queryKey: ['archival-history'] });
      queryClient.invalidateQueries({ queryKey: ['archival-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Archival failed: ${error.message}`);
    },
  });
}

export function useCreatePartitions() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-archival', {
        body: { action: 'create_partitions' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('New partitions created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create partitions: ${error.message}`);
    },
  });
}

export function useDropOldPartitions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (monthsToKeep: number = 12) => {
      const { data, error } = await supabase.functions.invoke('admin-archival', {
        body: { action: 'drop_old_partitions', months_to_keep: monthsToKeep },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const count = Array.isArray(data) ? data.length : 0;
      toast.success(`Dropped ${count} old partition(s)`);
      queryClient.invalidateQueries({ queryKey: ['archival-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to drop partitions: ${error.message}`);
    },
  });
}
