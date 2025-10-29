import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Scene {
  id: string;
  order_number: number;
  voice_over_text: string;
  image_prompt: string;
  image_preview_url?: string;
  is_edited: boolean;
  storyboard_id: string;
  created_at: string;
  updated_at: string;
}

interface Storyboard {
  id: string;
  user_id: string;
  topic: string;
  duration: number;
  style: string;
  tone: string;
  voice_id: string;
  voice_name: string;
  intro_image_prompt: string;
  intro_voiceover_text: string;
  status: 'draft' | 'rendering' | 'complete' | 'failed';
  template_id?: string;
  video_url?: string;
  video_storage_path?: string;
  render_job_id?: string;
  tokens_cost: number;
  estimated_render_cost: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

interface StoryboardInput {
  topic: string;
  duration: number;
  style: string;
  tone: string;
  voiceID: string;
  voiceName: string;
}

export const useStoryboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStoryboardId, setCurrentStoryboardId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  // Fetch current storyboard
  const { data: storyboard, isLoading: isLoadingStoryboard } = useQuery({
    queryKey: ['storyboard', currentStoryboardId],
    queryFn: async () => {
      if (!currentStoryboardId) return null;

      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .eq('id', currentStoryboardId)
        .single();

      if (error) throw error;
      return data as Storyboard;
    },
    enabled: !!currentStoryboardId,
  });

  // Fetch scenes for current storyboard
  const { data: scenes = [], isLoading: isLoadingScenes } = useQuery({
    queryKey: ['storyboard-scenes', currentStoryboardId],
    queryFn: async () => {
      if (!currentStoryboardId) return [];

      const { data, error } = await supabase
        .from('storyboard_scenes')
        .select('*')
        .eq('storyboard_id', currentStoryboardId)
        .order('order_number', { ascending: true });

      if (error) throw error;
      return data as Scene[];
    },
    enabled: !!currentStoryboardId,
  });

  // Generate storyboard mutation
  const generateMutation = useMutation({
    mutationFn: async (input: StoryboardInput) => {
      const { data, error } = await supabase.functions.invoke('generate-storyboard', {
        body: input,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCurrentStoryboardId(data.storyboard.id);
      queryClient.invalidateQueries({ queryKey: ['storyboard', data.storyboard.id] });
      queryClient.invalidateQueries({ queryKey: ['storyboard-scenes', data.storyboard.id] });
      toast.success(`Storyboard created! ${data.scenes.length} scenes generated`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate storyboard');
    },
  });

  // Update scene mutation
  const updateSceneMutation = useMutation({
    mutationFn: async ({ sceneId, field, value }: { sceneId: string; field: string; value: string }) => {
      const { data, error } = await supabase
        .from('storyboard_scenes')
        .update({ [field]: value, is_edited: true })
        .eq('id', sceneId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboard-scenes', currentStoryboardId] });
    },
  });

  // Regenerate scene mutation
  const regenerateSceneMutation = useMutation({
    mutationFn: async ({ sceneId, previousSceneText, nextSceneText }: {
      sceneId: string;
      previousSceneText: string;
      nextSceneText: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('regenerate-storyboard-scene', {
        body: {
          storyboardId: currentStoryboardId,
          sceneId,
          previousSceneText,
          nextSceneText,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboard-scenes', currentStoryboardId] });
      toast.success('Scene regenerated!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to regenerate scene');
    },
  });

  // Render video mutation
  const renderVideoMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('render-storyboard-video', {
        body: { storyboardId: currentStoryboardId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setIsRendering(true);
      toast.success('Video rendering started!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start rendering');
    },
  });

  // Poll render status
  useEffect(() => {
    if (!isRendering || !currentStoryboardId) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('poll-storyboard-status', {
          body: { storyboardId: currentStoryboardId },
        });

        if (error) throw error;

        setRenderProgress(data.progress);

        if (data.status === 'complete') {
          setIsRendering(false);
          queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
          toast.success('Video ready!');
        } else if (data.status === 'failed') {
          setIsRendering(false);
          toast.error('Video rendering failed');
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [isRendering, currentStoryboardId, queryClient]);

  // Realtime subscription for storyboard updates
  useEffect(() => {
    if (!currentStoryboardId) return;

    const channel = supabase
      .channel(`storyboard:${currentStoryboardId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'storyboards',
        filter: `id=eq.${currentStoryboardId}`
      }, (payload) => {
        queryClient.setQueryData(['storyboard', currentStoryboardId], payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStoryboardId, queryClient]);

  const generateStoryboard = useCallback(async (input: StoryboardInput) => {
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync(input);
    } finally {
      setIsGenerating(false);
    }
  }, [generateMutation]);

  const updateScene = useCallback((sceneId: string, field: string, value: string) => {
    updateSceneMutation.mutate({ sceneId, field, value });
  }, [updateSceneMutation]);

  const regenerateScene = useCallback((sceneId: string) => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    const previousSceneText = sceneIndex > 0 ? scenes[sceneIndex - 1].voice_over_text : '';
    const nextSceneText = sceneIndex < scenes.length - 1 ? scenes[sceneIndex + 1].voice_over_text : '';

    regenerateSceneMutation.mutate({ sceneId, previousSceneText, nextSceneText });
  }, [scenes, regenerateSceneMutation]);

  const navigateScene = useCallback((direction: 'prev' | 'next') => {
    if (!activeSceneId || scenes.length === 0) return;

    const currentIndex = scenes.findIndex(s => s.id === activeSceneId);
    if (currentIndex === -1) return;

    let newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    newIndex = Math.max(0, Math.min(scenes.length - 1, newIndex));

    setActiveSceneId(scenes[newIndex].id);
  }, [activeSceneId, scenes]);

  const renderVideo = useCallback(async () => {
    await renderVideoMutation.mutateAsync();
  }, [renderVideoMutation]);

  const clearStoryboard = useCallback(() => {
    setCurrentStoryboardId(null);
    setActiveSceneId(null);
    setIsGenerating(false);
    setIsRendering(false);
    setRenderProgress(0);
  }, []);

  // Set first scene as active when scenes load
  useEffect(() => {
    if (scenes.length > 0 && !activeSceneId) {
      setActiveSceneId(scenes[0].id);
    }
  }, [scenes, activeSceneId]);

  return {
    storyboard,
    scenes,
    activeSceneId,
    isGenerating,
    isRendering,
    renderProgress,
    isLoading: isLoadingStoryboard || isLoadingScenes,
    generateStoryboard,
    updateScene,
    regenerateScene,
    setActiveScene: setActiveSceneId,
    navigateScene,
    renderVideo,
    clearStoryboard,
  };
};