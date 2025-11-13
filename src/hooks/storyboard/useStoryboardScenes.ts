import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Scene, Storyboard } from './useStoryboardState';
import { logger } from '@/lib/logger';

export const useStoryboardScenes = (
  currentStoryboardId: string | null,
  storyboard: Storyboard | null | undefined,
  scenes: Scene[],
  activeSceneId: string | null,
  setActiveSceneId: (id: string | null) => void
) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      
      // If updating intro image, detect if it's actually a video
      if (field === 'intro_image_preview_url' && typeof value === 'string') {
        const isVideo = value.includes('.mp4') || value.includes('.webm') || value.includes('video');
        
        if (isVideo) {
          // Save to intro_video_url instead
          const { error } = await supabase
            .from('storyboards')
            .update({ 
              intro_video_url: value,
              intro_image_preview_url: null  // Clear old image
            })
            .eq('id', currentStoryboardId);
          
          if (error) throw error;
          return;
        }
      }
      
      // Regular field update (non-video)
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
      // Detect if this is a video or image based on URL
      const isVideo = imageUrl.includes('.mp4') || imageUrl.includes('.webm') || imageUrl.includes('video');
      
      const updateData = isVideo 
        ? { video_url: imageUrl, image_preview_url: null }  // Video: clear old image, set video
        : { image_preview_url: imageUrl };                   // Image: update preview
      
      const { error } = await supabase
        .from('storyboard_scenes')
        .update(updateData)
        .eq('id', sceneId);
      
      if (error) throw error;
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
    },
    onError: (error: Error, variables) => {
      logger.error('Regenerate scene failed', error, {
        component: 'useStoryboardScenes',
        operation: 'regenerateSceneMutation',
        sceneId: variables.sceneId
      });
    },
  });

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
  }, [activeSceneId, scenes, setActiveSceneId]);

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

    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated. Please log in again.');
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

    // 3. Generate all previews SEQUENTIALLY (one at a time for stability)
    const results: Array<{
      sceneNumber: number;
      success: boolean;
      url?: string;
      error?: string;
    }> = [];
    
    // Generate scenes one by one
    for (let i = 0; i < scenesToGenerate.length; i++) {
      if (signal.aborted) {
        throw new Error('Cancelled by user');
      }
      
      const scene = scenesToGenerate[i];
      
      // Update progress before starting this scene
      onProgress?.(i + 1, scenesToGenerate.length);
      
      try {
        // For intro scene, use intro image prompt
        const promptToUse = scene.imagePrompt;
        
        // Determine if we should use sync or async endpoint
        const functionName = model?.provider === 'runware' 
          ? 'generate-content-sync' 
          : 'generate-content';

        const { data, error } = await supabase.functions.invoke(functionName, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            model_id: modelId,
            prompt: promptToUse,
            custom_parameters: {},
          }
        });
        
        if (error) {
          // Better error handling for auth issues
          if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
            throw new Error('Authentication failed. Please try logging out and back in.');
          }
          throw error;
        }
        
        // Handle async generation (polling required)
        let outputUrl = data.output_url;
        
        if (!outputUrl && data.id) {
          // Poll for completion
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

      } catch (error) {
        logger.error('Scene generation failed', error as Error, {
          component: 'useStoryboardScenes',
          operation: 'generateAllScenePreviews',
          sceneNumber: scene.sceneNumber,
          isIntro: scene.isIntro
        });
        results.push({
          sceneNumber: scene.sceneNumber,
          success: false,
          error: error.message
        });
      }
    }

    onProgress?.(scenesToGenerate.length, scenesToGenerate.length);

    // Summary
    const successCount = results.filter((r: { success: boolean }) => r.success).length;
    const failCount = results.filter((r: { success: boolean }) => !r.success).length;
    
    if (failCount > 0) {
      logger.warn('Bulk generation completed with failures', {
        component: 'useStoryboardScenes',
        operation: 'generateAllScenePreviews',
        failed: failCount,
        succeeded: successCount
      });
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
    updateScene,
    updateIntroScene,
    regenerateScene,
    navigateScene,
    updateSceneImage: updateSceneImageMutation.mutate,
    generateAllScenePreviews,
  };
};
