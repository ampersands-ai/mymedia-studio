import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type Json = Database['public']['Tables']['storyboards']['Row']['subtitle_settings'];

export const useStoryboardSettings = (currentStoryboardId: string | null) => {
  const queryClient = useQueryClient();

  // Update render settings mutation (for voice, quality, subtitles, audio, image animation)
  const updateRenderSettingsMutation = useMutation({
    mutationFn: async (settings: {
      voice_id?: string;
      voice_name?: string;
      video_quality?: string;
      subtitle_settings?: Json;
      music_settings?: Json;
      image_animation_settings?: Json;
    }) => {
      if (!currentStoryboardId) throw new Error('No storyboard selected');
      
      const { data, error } = await supabase
        .from('storyboards')
        .update(settings)
        .eq('id', currentStoryboardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });

      // Track activity
      try {
        const { clientLogger } = await import('@/lib/logging/client-logger');
        clientLogger.activity({
          activityType: 'storyboard',
          activityName: 'storyboard_settings_updated',
          routeName: 'Storyboard',
          description: 'Updated storyboard render settings',
          metadata: {
            storyboard_id: currentStoryboardId,
            settings: Object.keys(variables),
          },
        });
      } catch (err) {
        logger.error('Failed to log storyboard settings activity', err as Error, {
          component: 'useStoryboardSettings',
          operation: 'trackActivity',
          storyboardId: currentStoryboardId
        });
        // Don't throw - logging failure shouldn't break settings update
      }
    },
    onError: (error: Error) => {
      logger.error('Update render settings failed', error, {
        component: 'useStoryboardSettings',
        operation: 'updateRenderSettingsMutation',
        storyboardId: currentStoryboardId
      });
      toast.error('Failed to update settings');
    },
  });

  const updateRenderSettings = useCallback((settings: {
    voice_id?: string;
    voice_name?: string;
    video_quality?: string;
    subtitle_settings?: Json;
    music_settings?: Json;
    image_animation_settings?: Json;
  }) => {
    updateRenderSettingsMutation.mutate(settings);
  }, [updateRenderSettingsMutation]);

  return {
    updateRenderSettings,
  };
};
