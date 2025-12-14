import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeatureFlags {
  templates: {
    enabled: boolean;
    all_enabled: boolean;
  };
  custom_creation: {
    enabled: boolean;
    groups: {
      image_editing: boolean;
      prompt_to_image: boolean;
      prompt_to_video: boolean;
      image_to_video: boolean;
      video_to_video: boolean;
      lip_sync: boolean;
      prompt_to_audio: boolean;
    };
  };
  faceless_videos: {
    enabled: boolean;
  };
  storyboard: {
    enabled: boolean;
  };
}

const DEFAULT_FLAGS: FeatureFlags = {
  templates: { enabled: true, all_enabled: true },
  custom_creation: {
    enabled: true,
    groups: {
      image_editing: true,
      prompt_to_image: true,
      prompt_to_video: true,
      image_to_video: true,
      video_to_video: true,
      lip_sync: true,
      prompt_to_audio: true,
    },
  },
  faceless_videos: { enabled: true },
  storyboard: { enabled: true },
};

export function useFeatureFlags() {
  const queryClient = useQueryClient();

  const { data: flags, isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async (): Promise<FeatureFlags> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'feature_flags')
        .single();

      if (error) {
        console.error('Error fetching feature flags:', error);
        return DEFAULT_FLAGS;
      }

      return (data?.setting_value as FeatureFlags) ?? DEFAULT_FLAGS;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const updateFlags = useMutation({
    mutationFn: async (newFlags: FeatureFlags) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ setting_value: newFlags as unknown as Json, updated_at: new Date().toISOString() })
        .eq('setting_key', 'feature_flags');

      if (error) throw error;
      return newFlags;
    },
    onMutate: async (newFlags) => {
      await queryClient.cancelQueries({ queryKey: ['feature-flags'] });
      const previousFlags = queryClient.getQueryData<FeatureFlags>(['feature-flags']);
      queryClient.setQueryData(['feature-flags'], newFlags);
      return { previousFlags };
    },
    onError: (err, _newFlags, context) => {
      queryClient.setQueryData(['feature-flags'], context?.previousFlags);
      toast.error('Failed to update feature flags');
      console.error('Error updating feature flags:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });

  const toggleFlag = (path: string, value: boolean) => {
    if (!flags) return;

    // Deep clone the flags object
    const newFlags: FeatureFlags = JSON.parse(JSON.stringify(flags));
    const parts = path.split('.');
    
    // Navigate to the nested property and set the value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = newFlags;

    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
    updateFlags.mutate(newFlags);
  };

  const isGroupEnabled = (groupId: string): boolean => {
    if (!flags) return true;
    if (!flags.custom_creation.enabled) return false;
    
    const groupKey = groupId as keyof typeof flags.custom_creation.groups;
    return flags.custom_creation.groups[groupKey] ?? true;
  };

  return {
    flags: flags ?? DEFAULT_FLAGS,
    isLoading,
    toggleFlag,
    isGroupEnabled,
    updateFlags: updateFlags.mutate,
    isUpdating: updateFlags.isPending,
  };
}
