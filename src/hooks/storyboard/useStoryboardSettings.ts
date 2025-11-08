import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useStoryboardSettings = (currentStoryboardId: string | null) => {
  const queryClient = useQueryClient();

  // Update render settings mutation (for voice, quality, subtitles, audio, image animation)
  const updateRenderSettingsMutation = useMutation({
    mutationFn: async (settings: {
      voice_id?: string;
      voice_name?: string;
      video_quality?: string;
      subtitle_settings?: any;
      music_settings?: any;
      image_animation_settings?: any;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
    },
    onError: (error: any) => {
      console.error('[useStoryboard] Update render settings error:', error);
      toast.error('Failed to update settings');
    },
  });

  const updateRenderSettings = useCallback((settings: {
    voice_id?: string;
    voice_name?: string;
    video_quality?: string;
    subtitle_settings?: any;
    music_settings?: any;
    image_animation_settings?: any;
  }) => {
    updateRenderSettingsMutation.mutate(settings);
  }, [updateRenderSettingsMutation]);

  return {
    updateRenderSettings,
  };
};
