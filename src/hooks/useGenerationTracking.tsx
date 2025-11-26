import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent, setUserProperties } from '@/lib/posthog';
import { useQueryClient } from '@tanstack/react-query';

export const useGenerationTracking = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Subscribe to generation updates
    const channel = supabase
      .channel('generation-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const generation = payload.new;
          
          // Track when generation completes
          if (generation.status === 'completed' && payload.old?.status !== 'completed') {
            trackEvent('generation_completed', {
              generation_id: generation.id,
              model_id: generation.model_id,
              template_id: generation.template_id,
              tokens_used: generation.tokens_used,
              content_type: generation.type,
            });

            // Update user properties with total generation count
            const { count } = await supabase
              .from('generations')
              .select('id', { count: 'exact', head: true } as { count: 'exact'; head: true })
              .eq('user_id', user.id)
              .eq('status', 'completed');

            if (count !== null) {
              setUserProperties({
                total_generations: count,
              });
            }

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['user-generations'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-generations'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};
