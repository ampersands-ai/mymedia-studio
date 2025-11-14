import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface ErrorNotification {
  id: string;
  user_id: string;
  error_event_id: string;
  title: string;
  message: string;
  action_label: string | null;
  action_url: string | null;
  shown: boolean;
  shown_at: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
  expires_at: string;
}

/**
 * Hook to manage user-facing error notifications
 * Provides graceful error handling with user-friendly messages
 */
export function useErrorNotifications() {
  const queryClient = useQueryClient();

  // Fetch active notifications for current user
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['error-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_error_notifications')
        .select('*')
        .eq('dismissed', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch error notifications', error);
        throw error;
      }

      return (data || []) as ErrorNotification[];
    },
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 20000,
  });

  // Mark notification as shown
  const markAsShown = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('user_error_notifications')
        .update({
          shown: true,
          shown_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-notifications'] });
    },
  });

  // Dismiss notification
  const dismissNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('user_error_notifications')
        .update({
          dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-notifications'] });
    },
  });

  return {
    notifications: notifications || [],
    isLoading,
    markAsShown,
    dismissNotification,
  };
}
