import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export interface UserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
  expires_at: string;
}

/**
 * Hook to manage user notifications with real-time updates
 * Notifications are visible for 24 hours
 */
export function useUserNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch active notifications for current user (non-expired)
  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ['user-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Using type assertion since table was just created and types may not be updated yet
      const { data, error: queryError } = await (supabase as any)
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (queryError) {
        logger.error('Failed to fetch user notifications', queryError);
        throw queryError;
      }

      return (data || []) as UserNotification[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000, // Fallback polling every minute
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Add new notification to cache
          queryClient.setQueryData<UserNotification[]>(
            ['user-notifications', user.id],
            (old = []) => {
              const newNotification = payload.new as UserNotification;
              // Avoid duplicates
              if (old.some((n) => n.id === newNotification.id)) {
                return old;
              }
              return [newNotification, ...old].slice(0, 50);
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Update notification in cache
          queryClient.setQueryData<UserNotification[]>(
            ['user-notifications', user.id],
            (old = []) =>
              old.map((n) =>
                n.id === (payload.new as UserNotification).id
                  ? (payload.new as UserNotification)
                  : n
              )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Remove notification from cache
          queryClient.setQueryData<UserNotification[]>(
            ['user-notifications', user.id],
            (old = []) =>
              old.filter((n) => n.id !== (payload.old as { id: string }).id)
          );
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, queryClient]);

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error: mutateError } = await (supabase as any)
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (mutateError) throw mutateError;
    },
    onMutate: async (notificationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['user-notifications', user?.id] });
      const previousNotifications = queryClient.getQueryData<UserNotification[]>([
        'user-notifications',
        user?.id,
      ]);

      queryClient.setQueryData<UserNotification[]>(
        ['user-notifications', user?.id],
        (old = []) =>
          old.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );

      return { previousNotifications };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['user-notifications', user?.id],
          context.previousNotifications
        );
      }
    },
  });

  // Mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error: mutateError } = await (supabase as any)
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (mutateError) throw mutateError;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['user-notifications', user?.id] });
      const previousNotifications = queryClient.getQueryData<UserNotification[]>([
        'user-notifications',
        user?.id,
      ]);

      queryClient.setQueryData<UserNotification[]>(
        ['user-notifications', user?.id],
        (old = []) => old.map((n) => ({ ...n, is_read: true }))
      );

      return { previousNotifications };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['user-notifications', user?.id],
          context.previousNotifications
        );
      }
    },
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error: mutateError } = await (supabase as any)
        .from('user_notifications')
        .delete()
        .eq('id', notificationId);

      if (mutateError) throw mutateError;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['user-notifications', user?.id] });
      const previousNotifications = queryClient.getQueryData<UserNotification[]>([
        'user-notifications',
        user?.id,
      ]);

      queryClient.setQueryData<UserNotification[]>(
        ['user-notifications', user?.id],
        (old = []) => old.filter((n) => n.id !== notificationId)
      );

      return { previousNotifications };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['user-notifications', user?.id],
          context.previousNotifications
        );
      }
    },
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  return {
    notifications: notifications || [],
    unreadCount,
    isLoading,
    error,
    isRealtimeConnected,
    markAsRead: (id: string) => markAsRead.mutate(id),
    markAllAsRead: () => markAllAsRead.mutate(),
    deleteNotification: (id: string) => deleteNotification.mutate(id),
  };
}
