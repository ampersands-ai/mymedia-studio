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
  intro_image_preview_url?: string;
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
  video_quality?: string;
  subtitle_settings?: {
    style?: string;
    fontFamily?: string;
    fontSize?: number;
    position?: string;
    [key: string]: any;
  };
  music_settings?: {
    volume?: number;
    fadeIn?: number;
    fadeOut?: number;
    [key: string]: any;
  };
  image_animation_settings?: {
    zoom?: number;
    position?: string;
  };
}

interface StoryboardInput {
  topic: string;
  duration: number;
  style: string;
  tone: string;
  voiceID: string;
  voiceName: string;
  mediaType?: 'image' | 'video' | 'animated';
  backgroundMusicUrl?: string;
  backgroundMusicVolume?: number;
  aspectRatio?: string;
  videoQuality?: string;
  customWidth?: number;
  customHeight?: number;
  subtitleSettings?: {
    position: string;
    fontSize: number;
    outlineColor: string;
    outlineWidth: number;
    language?: string;
    model?: string;
    style?: string;
    fontFamily?: string;
    allCaps?: boolean;
    boxColor?: string;
    lineColor?: string;
    wordColor?: string;
    shadowColor?: string;
    shadowOffset?: number;
    maxWordsPerLine?: number;
  };
  musicSettings?: {
    volume: number;
    fadeIn: number;
    fadeOut: number;
    duration: number;
  };
  imageAnimationSettings?: {
    zoom: number;
    position: string;
  };
  enableCache?: boolean;
  draftMode?: boolean;
}

export const useStoryboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Initialize from localStorage on mount
  const [currentStoryboardId, setCurrentStoryboardId] = useState<string | null>(() => {
    return localStorage.getItem('currentStoryboardId');
  });
  
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderingStartTime, setRenderingStartTime] = useState<number | null>(null);
  const [estimatedRenderTime, setEstimatedRenderTime] = useState<number | null>(null);

  // Wrapper to persist storyboard ID to localStorage
  const setAndPersistStoryboardId = useCallback((id: string | null) => {
    setCurrentStoryboardId(id);
    if (id) {
      localStorage.setItem('currentStoryboardId', id);
    } else {
      localStorage.removeItem('currentStoryboardId');
    }
    // Notify other hook instances in the same tab
    window.dispatchEvent(new CustomEvent('storyboard-id-changed', { detail: id }));
  }, []);

  // Sync storyboard ID across all hook instances (same tab and cross-tab)
  useEffect(() => {
    const onCustomEvent = (e: Event) => {
      const ce = e as CustomEvent<string | null>;
      setCurrentStoryboardId(ce.detail ?? null);
    };
    
    const onStorageEvent = (e: StorageEvent) => {
      if (e.key === 'currentStoryboardId') {
        setCurrentStoryboardId(e.newValue);
      }
    };
    
    window.addEventListener('storyboard-id-changed', onCustomEvent as EventListener);
    window.addEventListener('storage', onStorageEvent);
    
    return () => {
      window.removeEventListener('storyboard-id-changed', onCustomEvent as EventListener);
      window.removeEventListener('storage', onStorageEvent);
    };
  }, []);

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
        body: {
          topic: input.topic,
          duration: input.duration,
          style: input.style,
          tone: input.tone,
          voice_id: input.voiceID,
          voice_name: input.voiceName,
          media_type: input.mediaType || 'image',
          background_music_url: input.backgroundMusicUrl || null,
          background_music_volume: input.backgroundMusicVolume || 5,
          aspect_ratio: input.aspectRatio || 'full-hd',
          video_quality: input.videoQuality || 'medium',
          custom_width: input.customWidth,
          custom_height: input.customHeight,
          subtitle_settings: input.subtitleSettings || {
            position: 'mid-bottom-center',
            fontSize: 140,
            outlineColor: '#000000',
            outlineWidth: 8,
          },
          music_settings: input.musicSettings || {
            volume: 0.05,
            fadeIn: 2,
            fadeOut: 2,
            duration: -2,
          },
          image_animation_settings: input.imageAnimationSettings || {
            zoom: 2,
            position: 'center-center',
          },
          enable_cache: input.enableCache ?? true,
          draft_mode: input.draftMode ?? false,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const newStoryboardId = data.storyboard.id;
      
      // Prime caches so UI can show instantly
      queryClient.setQueryData(['storyboard', newStoryboardId], data.storyboard);
      queryClient.setQueryData(['storyboard-scenes', newStoryboardId], data.scenes);
      
      // First, remove old queries from cache
      queryClient.removeQueries({ queryKey: ['storyboard'] });
      queryClient.removeQueries({ queryKey: ['storyboard-scenes'] });
      
      // Then set the new ID (triggers new queries)
      setAndPersistStoryboardId(newStoryboardId);
      
      // Invalidate to force refetch
      queryClient.invalidateQueries({ queryKey: ['storyboard', newStoryboardId] });
      queryClient.invalidateQueries({ queryKey: ['storyboard-scenes', newStoryboardId] });
    },
    onError: (error: any) => {
      console.error('[useStoryboard] Generate error:', error);
      const errorMessage = error?.message || 'Failed to generate storyboard';
      toast.error(errorMessage, {
        description: 'Please check your credits and try again',
        duration: 5000
      });
      setIsGenerating(false);
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

  // Update intro scene mutation
  const updateIntroSceneMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      if (!currentStoryboardId) throw new Error('No storyboard selected');
      
      const { data, error } = await supabase
        .from('storyboards')
        .update({ [field]: value })
        .eq('id', currentStoryboardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
    },
  });

  // Update scene image mutation
  const updateSceneImageMutation = useMutation({
    mutationFn: async ({ sceneId, imageUrl }: { sceneId: string; imageUrl: string }) => {
      const { error } = await supabase
        .from('storyboard_scenes')
        .update({ image_preview_url: imageUrl })
        .eq('id', sceneId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboard-scenes', currentStoryboardId] });
    },
  });

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
    },
    onError: (error: any) => {
      console.error('[useStoryboard] Regenerate scene error:', error);
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
    onSuccess: (data) => {
      setIsRendering(true);
      setRenderingStartTime(Date.now());
      // Store the estimated render time (2x video duration)
      if (storyboard?.duration) {
        setEstimatedRenderTime(storyboard.duration * 2);
      }
    },
    onError: (error: any) => {
      console.error('[useStoryboard] Render start error:', error);
    },
  });

  // Cancel render mutation
  const cancelRenderMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('cancel-render', {
        body: { storyboardId: currentStoryboardId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setIsRendering(false);
      setRenderProgress(0);
      setRenderingStartTime(null);
      queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
      toast.success('Render canceled. Status updated to draft.');
    },
    onError: (error: any) => {
      console.error('[useStoryboard] Cancel render error:', error);
      toast.error(`Failed to cancel render: ${error.message}`);
    },
  });

  // Poll render status with timeout detection and auto-recovery
  useEffect(() => {
    if (!isRendering || !currentStoryboardId) return;

    const interval = setInterval(async () => {
      try {
        // Pass storyboardId in body for better compatibility
        const { data, error } = await supabase.functions.invoke(
          'poll-storyboard-status',
          { body: { storyboardId: currentStoryboardId } }
        );

        if (error) throw error;

        // Calculate progress based on 2x the video duration
        const targetDuration = estimatedRenderTime || (storyboard ? storyboard.duration * 2 : 120);
        const elapsed = renderingStartTime ? (Date.now() - renderingStartTime) / 1000 : 0;
        
        // Progress goes from 0% to 90% over targetDuration seconds
        let calculatedProgress = 0;
        if (elapsed <= targetDuration) {
          calculatedProgress = Math.floor((elapsed / targetDuration) * 90);
        } else {
          calculatedProgress = 90; // Stay at 90% until complete
        }
        
        setRenderProgress(calculatedProgress);

        if (data.status === 'complete') {
          setRenderProgress(100);
          setIsRendering(false);
          setRenderingStartTime(null);
          setEstimatedRenderTime(null);
          queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
        } else if (data.status === 'failed') {
          setIsRendering(false);
          setRenderingStartTime(null);
          setEstimatedRenderTime(null);
        }

        // Phase 4: Timeout detection (10 minutes)
        if (renderingStartTime && Date.now() - renderingStartTime > 10 * 60 * 1000) {
          console.warn('[useStoryboard] Rendering timeout detected, attempting manual fetch...');
          
          // Try manual fetch from JSON2Video
          const { data: storyboardData } = await supabase
            .from('storyboards')
            .select('render_job_id')
            .eq('id', currentStoryboardId)
            .single();

          if (storyboardData?.render_job_id) {
            const { data: fetchData, error: fetchError } = await supabase.functions.invoke(
              'fetch-video-status',
              { body: { renderJobId: storyboardData.render_job_id } }
            );

            if (!fetchError && fetchData?.success) {
              console.log('[useStoryboard] Video recovered successfully');
              setIsRendering(false);
              setRenderingStartTime(null);
              setEstimatedRenderTime(null);
              queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
            } else {
              console.warn('[useStoryboard] Manual fetch failed, rendering still in progress');
            }
          }
        }
      } catch (error) {
        console.error('[useStoryboard] Poll error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [isRendering, currentStoryboardId, queryClient, renderingStartTime, estimatedRenderTime, storyboard]);

  // Realtime subscription for storyboard updates (webhook notifications)
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
        const updatedStoryboard = payload.new as Storyboard;
        queryClient.setQueryData(['storyboard', currentStoryboardId], updatedStoryboard);
        
        // Update state when webhook notifies status change
        if (updatedStoryboard.status === 'complete' && isRendering) {
          setIsRendering(false);
          setRenderProgress(100);
        } else if (updatedStoryboard.status === 'failed' && isRendering) {
          setIsRendering(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStoryboardId, queryClient, isRendering]);

  const generateStoryboard = useCallback(async (input: StoryboardInput) => {
    setIsGenerating(true);
    // Clear the old storyboard ID BEFORE generating
    setAndPersistStoryboardId(null);
    setActiveSceneId(null);
    
    try {
      toast.loading('Generating storyboard...', { id: 'generate-storyboard' });
      await generateMutation.mutateAsync(input);
      toast.success('Storyboard generated successfully!', { id: 'generate-storyboard' });
    } catch (error: any) {
      console.error('[generateStoryboard] Error:', error);
      toast.error(
        error?.message || 'Failed to generate storyboard', 
        { 
          id: 'generate-storyboard',
          description: 'Please check your credits and try again'
        }
      );
    } finally {
      setIsGenerating(false);
    }
  }, [generateMutation, setAndPersistStoryboardId]);

  const updateScene = useCallback((sceneId: string, field: string, value: string) => {
    updateSceneMutation.mutate({ sceneId, field, value });
  }, [updateSceneMutation]);

  const updateIntroScene = useCallback((field: string, value: string) => {
    updateIntroSceneMutation.mutate({ field, value });
  }, [updateIntroSceneMutation]);

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

  const cancelRender = useCallback(() => {
    cancelRenderMutation.mutate();
  }, [cancelRenderMutation]);

  const clearStoryboard = useCallback(() => {
    setAndPersistStoryboardId(null);
    setActiveSceneId(null);
    setIsGenerating(false);
    setIsRendering(false);
    setRenderProgress(0);
    setRenderingStartTime(null);
  }, [setAndPersistStoryboardId]);

  // Manual refresh status for stuck videos
  const refreshStatus = useCallback(async () => {
    if (!currentStoryboardId) return;

    try {
      const { data: storyboardData } = await supabase
        .from('storyboards')
        .select('render_job_id, status')
        .eq('id', currentStoryboardId)
        .single();

      if (!storyboardData?.render_job_id) {
        toast.error('No render job ID found');
        return;
      }

      if (storyboardData.status === 'complete') {
        toast.info('Video already complete!');
        queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
        return;
      }

      console.log('[useStoryboard] Checking video status...');

      const { data, error } = await supabase.functions.invoke(
        'fetch-video-status',
        { body: { renderJobId: storyboardData.render_job_id } }
      );

      if (error) throw error;

      if (data.status === 'complete') {
        console.log('[useStoryboard] Video is ready');
        setIsRendering(false);
        setRenderingStartTime(null);
        queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
      } else if (data.status === 'failed') {
        console.warn('[useStoryboard] Video rendering failed');
        setIsRendering(false);
        setRenderingStartTime(null);
      } else {
        console.log('[useStoryboard] Still rendering...');
      }
    } catch (error: any) {
      console.error('[useStoryboard] Failed to check status:', error);
    }
  }, [currentStoryboardId, queryClient]);

  // Set first scene as active when scenes load
  useEffect(() => {
    if (scenes.length > 0 && !activeSceneId) {
      setActiveSceneId(scenes[0].id);
    }
  }, [scenes, activeSceneId]);

  // Helper function for polling async generations
  const pollForGenerationResult = async (
    generationId: string, 
    signal: AbortSignal
  ): Promise<string> => {
    const maxAttempts = 60; // 60 seconds max
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (signal.aborted) {
        throw new Error('Polling cancelled');
      }

      const { data, error } = await supabase
        .from('generations')
        .select('status, output_url')
        .eq('id', generationId)
        .single();

      if (error) throw error;

      if (data.status === 'completed' && data.output_url) {
        return data.output_url;
      }

      if (data.status === 'failed') {
        throw new Error('Generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Generation timed out after 60 seconds');
  };

  // Generate all scene previews at once
  const generateAllScenePreviews = useCallback(async (
    modelId: string,
    signal: AbortSignal,
    onProgress?: (current: number, total: number) => void
  ) => {
    if (!currentStoryboardId || !user) {
      throw new Error('No storyboard or user');
    }

    // 1. Identify scenes needing previews
    const scenesToGenerate = [
      // Intro scene
      ...(storyboard?.intro_image_preview_url ? [] : [{
        id: storyboard.id,
        imagePrompt: storyboard.intro_image_prompt,
        sceneNumber: 1,
        isIntro: true
      }]),
      // Regular scenes without previews
      ...scenes
        .filter(scene => !scene.image_preview_url && scene.image_prompt)
        .map((scene, idx) => ({
          id: scene.id,
          imagePrompt: scene.image_prompt,
          sceneNumber: scenes.findIndex(s => s.id === scene.id) + 2,
          isIntro: false
        }))
    ];

    if (scenesToGenerate.length === 0) {
      return { success: true, generated: 0, failed: 0, results: [] };
    }

    // 2. Check credit balance upfront
    const { data: model } = await supabase
      .from('ai_models')
      .select('base_token_cost, provider')
      .eq('id', modelId)
      .single();
    
    const tokenCost = model?.base_token_cost || 1;
    const totalCost = tokenCost * scenesToGenerate.length;
    
    const { data: tokenData } = await supabase
      .from('user_subscriptions')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();
    
    if ((tokenData?.tokens_remaining || 0) < totalCost) {
      throw new Error(`Insufficient credits. Need ${totalCost} credits to generate ${scenesToGenerate.length} previews.`);
    }

    // 3. Generate sequentially with cancellation support
    const results = [];
    for (let i = 0; i < scenesToGenerate.length; i++) {
      // Check for cancellation
      if (signal.aborted) {
        throw new Error('Generation cancelled by user');
      }

      const scene = scenesToGenerate[i];
      onProgress?.(i + 1, scenesToGenerate.length);

      try {
        // Use appropriate endpoint based on model provider
        const functionName = model?.provider === 'runware' 
          ? 'generate-content-sync' 
          : 'generate-content';

        const { data, error } = await supabase.functions.invoke(functionName, {
          body: {
            model_id: modelId,
            prompt: scene.imagePrompt,
            custom_parameters: {},
          }
        });
        
        if (error) throw error;
        
        // Handle async generation (polling required)
        let outputUrl = data.output_url;
        if (!outputUrl && data.id) {
          // Poll for async generation result
          outputUrl = await pollForGenerationResult(data.id, signal);
        }

        // Update scene with preview URL
        if (scene.isIntro) {
          await updateIntroSceneMutation.mutateAsync({ 
            field: 'intro_image_preview_url', 
            value: outputUrl 
          });
        } else {
          await updateSceneImageMutation.mutateAsync({ 
            sceneId: scene.id, 
            imageUrl: outputUrl 
          });
        }
        
        results.push({ 
          sceneNumber: scene.sceneNumber, 
          success: true, 
          url: outputUrl 
        });
        
        console.log(`✅ Generated preview for scene ${scene.sceneNumber}`);
      } catch (error: any) {
        if (signal.aborted) {
          throw new Error('Generation cancelled by user');
        }
        
        console.error(`❌ Failed to generate preview for scene ${scene.sceneNumber}:`, error);
        results.push({ 
          sceneNumber: scene.sceneNumber, 
          success: false, 
          error: error.message 
        });
        
        // Continue with remaining scenes even if one fails
      }
    }

    onProgress?.(scenesToGenerate.length, scenesToGenerate.length);

    // Summary
    const successCount = results.filter((r: any) => r.success).length;
    const failCount = results.filter((r: any) => !r.success).length;
    
    if (failCount > 0) {
      console.warn(`⚠️ Bulk generation completed with ${failCount} failures`);
    }

    toast.success(`Generated ${successCount} of ${scenesToGenerate.length} previews`);

    return { 
      success: true, 
      generated: successCount, 
      failed: failCount,
      results 
    };
  }, [currentStoryboardId, user, storyboard, scenes, updateIntroSceneMutation, updateSceneImageMutation]);

  return {
    storyboard,
    scenes,
    activeSceneId,
    isGenerating,
    isRendering,
    renderProgress,
    renderingStartTime,
    isLoading: isLoadingStoryboard || isLoadingScenes,
    generateStoryboard,
    updateScene,
    updateIntroScene,
    regenerateScene,
    setActiveScene: setActiveSceneId,
    navigateScene,
    renderVideo,
    cancelRender,
    isCancelingRender: cancelRenderMutation.isPending,
    clearStoryboard,
    refreshStatus,
    updateSceneImage: updateSceneImageMutation.mutate,
    updateRenderSettings: updateRenderSettingsMutation.mutate,
    generateAllScenePreviews,
  };
};