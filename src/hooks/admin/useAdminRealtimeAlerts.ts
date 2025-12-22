import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  user_id: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export const useAdminRealtimeAlerts = () => {
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // Fetch alerts
  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ['admin-realtime-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_realtime_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AdminAlert[];
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_realtime_alerts',
        },
        (payload) => {
          queryClient.setQueryData(['admin-realtime-alerts'], (old: AdminAlert[] = []) => {
            return [payload.new as AdminAlert, ...old].slice(0, 50);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_realtime_alerts',
        },
        (payload) => {
          queryClient.setQueryData(['admin-realtime-alerts'], (old: AdminAlert[] = []) => {
            return old.map(alert => 
              alert.id === (payload.new as AdminAlert).id ? payload.new as AdminAlert : alert
            );
          });
        }
      )
      .subscribe((status) => {
        setRealtimeEnabled(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Mark single alert as read
  const markAsRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('admin_realtime_alerts')
        .update({ is_read: true })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-realtime-alerts'] });
    },
  });

  // Mark all alerts as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('admin_realtime_alerts')
        .update({ is_read: true })
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-realtime-alerts'] });
    },
  });

  // Delete old alerts
  const deleteAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('admin_realtime_alerts')
        .delete()
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-realtime-alerts'] });
    },
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return {
    alerts,
    unreadCount,
    isLoading,
    error,
    realtimeEnabled,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteAlert: deleteAlert.mutate,
  };
};
