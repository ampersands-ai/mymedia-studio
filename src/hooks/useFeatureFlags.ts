import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeatureGroupFlags {
  enabled: boolean;
  coming_soon: boolean;
}

export interface FeatureFlags {
  templates: {
    enabled: boolean;
    all_enabled: boolean;
    coming_soon: boolean;
  };
  custom_creation: {
    enabled: boolean;
    coming_soon: boolean;
    groups: {
      image_editing: FeatureGroupFlags;
      prompt_to_image: FeatureGroupFlags;
      prompt_to_video: FeatureGroupFlags;
      image_to_video: FeatureGroupFlags;
      video_to_video: FeatureGroupFlags;
      lip_sync: FeatureGroupFlags;
      prompt_to_audio: FeatureGroupFlags;
    };
  };
  faceless_videos: {
    enabled: boolean;
    coming_soon: boolean;
  };
  storyboard: {
    enabled: boolean;
    coming_soon: boolean;
  };
  pages: {
    features: { enabled: boolean };
    blog: { enabled: boolean };
    community: { enabled: boolean };
    templateLandings: { enabled: boolean };
  };
}

const DEFAULT_FLAGS: FeatureFlags = {
  templates: { enabled: true, all_enabled: true, coming_soon: false },
  custom_creation: {
    enabled: true,
    coming_soon: false,
    groups: {
      image_editing: { enabled: true, coming_soon: false },
      prompt_to_image: { enabled: true, coming_soon: false },
      prompt_to_video: { enabled: true, coming_soon: false },
      image_to_video: { enabled: true, coming_soon: false },
      video_to_video: { enabled: true, coming_soon: false },
      lip_sync: { enabled: true, coming_soon: true },
      prompt_to_audio: { enabled: true, coming_soon: true },
    },
  },
  faceless_videos: { enabled: true, coming_soon: true },
  storyboard: { enabled: true, coming_soon: true },
  pages: {
    features: { enabled: false },
    blog: { enabled: false },
    community: { enabled: false },
    templateLandings: { enabled: false },
  },
};

// Helper to migrate old flag format to new format
function migrateFlags(rawFlags: unknown): FeatureFlags {
  const flags = rawFlags as Record<string, unknown>;
  
  // Start with defaults
  const result: FeatureFlags = JSON.parse(JSON.stringify(DEFAULT_FLAGS));
  
  // Migrate templates
  if (flags.templates) {
    const t = flags.templates as Record<string, unknown>;
    result.templates.enabled = t.enabled as boolean ?? true;
    result.templates.all_enabled = t.all_enabled as boolean ?? true;
    result.templates.coming_soon = t.coming_soon as boolean ?? false;
  }
  
  // Migrate custom_creation
  if (flags.custom_creation) {
    const cc = flags.custom_creation as Record<string, unknown>;
    result.custom_creation.enabled = cc.enabled as boolean ?? true;
    result.custom_creation.coming_soon = cc.coming_soon as boolean ?? false;
    
    if (cc.groups) {
      const groups = cc.groups as Record<string, unknown>;
      for (const key of Object.keys(result.custom_creation.groups)) {
        const groupKey = key as keyof typeof result.custom_creation.groups;
        const groupValue = groups[key];
        
        if (typeof groupValue === 'boolean') {
          // Old format: just a boolean
          result.custom_creation.groups[groupKey] = { enabled: groupValue, coming_soon: false };
        } else if (groupValue && typeof groupValue === 'object') {
          // New format: { enabled, coming_soon }
          const gv = groupValue as Record<string, boolean>;
          result.custom_creation.groups[groupKey] = {
            enabled: gv.enabled ?? true,
            coming_soon: gv.coming_soon ?? false,
          };
        }
      }
    }
  }
  
  // Migrate faceless_videos
  if (flags.faceless_videos) {
    const fv = flags.faceless_videos as Record<string, unknown>;
    result.faceless_videos.enabled = fv.enabled as boolean ?? true;
    result.faceless_videos.coming_soon = fv.coming_soon as boolean ?? false;
  }
  
  // Migrate storyboard
  if (flags.storyboard) {
    const sb = flags.storyboard as Record<string, unknown>;
    result.storyboard.enabled = sb.enabled as boolean ?? true;
    result.storyboard.coming_soon = sb.coming_soon as boolean ?? false;
  }
  
  // Migrate pages
  if (flags.pages) {
    const p = flags.pages as Record<string, unknown>;
    if (p.features && typeof p.features === 'object') {
      const features = p.features as Record<string, boolean>;
      result.pages.features.enabled = features.enabled ?? true;
    }
    if (p.blog && typeof p.blog === 'object') {
      const blog = p.blog as Record<string, boolean>;
      result.pages.blog.enabled = blog.enabled ?? true;
    }
    if (p.community && typeof p.community === 'object') {
      const community = p.community as Record<string, boolean>;
      result.pages.community.enabled = community.enabled ?? false;
    }
    if (p.templateLandings && typeof p.templateLandings === 'object') {
      const templateLandings = p.templateLandings as Record<string, boolean>;
      result.pages.templateLandings.enabled = templateLandings.enabled ?? false;
    }
  }
  
  return result;
}

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

      return migrateFlags(data?.setting_value) ?? DEFAULT_FLAGS;
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
      toast.error(`Failed to update feature flags: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
    const group = flags.custom_creation.groups[groupKey];
    return group?.enabled ?? true;
  };

  const isGroupComingSoon = (groupId: string): boolean => {
    if (!flags) return false;
    if (!flags.custom_creation.enabled) return false;
    
    const groupKey = groupId as keyof typeof flags.custom_creation.groups;
    const group = flags.custom_creation.groups[groupKey];
    return group?.coming_soon ?? false;
  };

  const isFeatureEnabled = (featureId: 'templates' | 'custom_creation' | 'faceless_videos' | 'storyboard'): boolean => {
    if (!flags) return true;
    return flags[featureId].enabled;
  };

  const isFeatureComingSoon = (featureId: 'templates' | 'custom_creation' | 'faceless_videos' | 'storyboard'): boolean => {
    if (!flags) return false;
    return flags[featureId].enabled && flags[featureId].coming_soon;
  };

  const isPageEnabled = (pageId: 'features' | 'blog' | 'community' | 'templateLandings'): boolean => {
    if (!flags) return false;
    return flags.pages[pageId].enabled;
  };

  return {
    flags: flags ?? DEFAULT_FLAGS,
    isLoading,
    toggleFlag,
    isGroupEnabled,
    isGroupComingSoon,
    isFeatureEnabled,
    isFeatureComingSoon,
    isPageEnabled,
    updateFlags: updateFlags.mutate,
    isUpdating: updateFlags.isPending,
  };
}
