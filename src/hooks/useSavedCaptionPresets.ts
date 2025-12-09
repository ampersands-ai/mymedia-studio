import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CaptionStyle } from '@/types/video';
import { toast } from 'sonner';

export function useSavedCaptionPresets() {
  const queryClient = useQueryClient();

  const { data: presets, isLoading } = useQuery({
    queryKey: ['saved-caption-presets'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('saved_caption_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  const savePreset = useMutation({
    mutationFn: async ({ name, settings }: { name: string; settings: CaptionStyle }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if we already have 3 presets
      const { data: existing } = await supabase
        .from('saved_caption_presets')
        .select('id')
        .eq('user_id', user.id);

      if (existing && existing.length >= 3) {
        throw new Error('Maximum 3 presets allowed. Delete one to save a new preset.');
      }

      const { error } = await supabase
        .from('saved_caption_presets')
        .insert([{
          user_id: user.id,
          name,
          settings: settings as any,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-caption-presets'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save preset');
    },
  });

  const deletePreset = useMutation({
    mutationFn: async (presetId: string) => {
      const { error } = await supabase
        .from('saved_caption_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-caption-presets'] });
      toast.success('Preset deleted');
    },
    onError: () => {
      toast.error('Failed to delete preset');
    },
  });

  return {
    presets,
    isLoading,
    savePreset,
    deletePreset,
  };
}
