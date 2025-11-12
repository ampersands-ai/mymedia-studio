import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";

export const useUserTokens = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isConnected, setIsConnected] = useState(false);

  // Phase 2: Replace polling with real-time subscriptions (with lazy connection)
  useEffect(() => {
    if (!user?.id) return;

    // Delay realtime connection by 1 second after authentication for faster initial load
    const connectTimer = setTimeout(() => {
      const channel = supabase
        .channel('user-tokens-realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_subscriptions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            logger.debug('Credit update received', {
              component: 'useUserTokens',
              operation: 'realtime_update',
              userId: user.id,
              newTokens: payload.new?.tokens_remaining
            });
            queryClient.setQueryData(['user-tokens', user.id], payload.new);
          }
        )
        .on('system', {}, (payload) => {
          if (payload.status === 'CHANNEL_ERROR') {
            logger.error('Channel error, reconnecting', new Error('Realtime channel error'), {
              component: 'useUserTokens',
              operation: 'realtime_channel',
              userId: user.id,
              status: payload.status
            });
            setIsConnected(false);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            logger.debug('Connected to user credits realtime', {
              component: 'useUserTokens',
              operation: 'realtime_subscribe',
              userId: user.id,
              status
            });
          }
        });

      return () => {
        setIsConnected(false);
        channel.unsubscribe();
        supabase.removeChannel(channel);
      };
    }, 1000);

    return () => {
      clearTimeout(connectTimer);
    };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ["user-tokens", user?.id],
    queryFn: async () => {
      if (!user) return { tokens_remaining: 0, plan: "freemium" };

      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("tokens_remaining, plan")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // Check if it's an auth error
        const errorMessage = error.message?.toLowerCase() || '';
        if (
          errorMessage.includes('jwt') ||
          errorMessage.includes('session') ||
          error.code === 'PGRST301'
        ) {
          logger.error('Auth error detected in useUserTokens', error instanceof Error ? error : new Error(String(error)), {
            component: 'useUserTokens',
            operation: 'queryFn',
            errorCode: error.code,
            userId: user?.id
          });
          // Return default values instead of throwing
          return { tokens_remaining: 0, plan: "freemium" };
        }
        throw error;
      }
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes (increased from 10s)
    gcTime: 60 * 1000, // 1 minute
    // Removed refetchInterval - now using real-time subscriptions
  });
};
