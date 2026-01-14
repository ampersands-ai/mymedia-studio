import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserCredits } from '@/hooks/useUserCredits';
import { getAllModels } from '@/lib/models/registry';
import { logger } from '@/lib/logger';
import { mapAspectRatioToModelParameters } from '@/lib/aspect-ratio-mapper';
import { MODEL_CONFIG as NANO_BANANA_CONFIG } from '@/lib/models/locked/prompt_to_image/Nano_Banana_Pro';
import { useBlackboardPolling, VIDEO_GENERATION_TIMEOUT_MS } from './useBlackboardPolling';
import { getPublicImageUrl } from '@/lib/supabase-images';
import { useAuth } from '@/contexts/AuthContext';

export interface BlackboardScene {
  id: string;
  imagePrompt: string;
  generatedImageUrl?: string;
  imageGenerationStatus: 'idle' | 'generating' | 'complete' | 'failed';
  
  videoPrompt: string;
  generatedVideoUrl?: string;
  videoGenerationStatus: 'idle' | 'generating' | 'complete' | 'failed';
  
  usePreviousImageAsSeed: boolean;
}

// Fixed model IDs (not user-selectable)
const TEXT_TO_IMAGE_MODEL_ID = 'c5d6e7f8-9a0b-1c2d-3e4f-5a6b7c8d9e0f'; // Nano Banana Pro (T2I)
const IMAGE_TO_IMAGE_MODEL_ID = 'b4c5d6e7-8f9a-0b1c-2d3e-4f5a6b7c8d9e'; // Nano Banana Pro (I2I)
const VIDEO_MODEL_LITE_ID = '8aac94cb-5625-47f4-880c-4f0fd8bd83a1'; // Google Veo 3.1 Fast (30 credits)
const VIDEO_MODEL_HQ_ID = 'a5c2ec16-6294-4588-86b6-7b4182601cda'; // Google Veo 3.1 HQ (125 credits)

const STORAGE_KEY = 'blackboard_storyboard_id';

export type VideoModelType = 'lite' | 'hq';

export const createEmptyScene = (isFirst: boolean = false): BlackboardScene => ({
  id: crypto.randomUUID(),
  imagePrompt: '',
  generatedImageUrl: undefined,
  imageGenerationStatus: 'idle',
  videoPrompt: '',
  generatedVideoUrl: undefined,
  videoGenerationStatus: 'idle',
  usePreviousImageAsSeed: !isFirst,
});

// Map DB scene to local scene
const mapDbSceneToLocal = (dbScene: any): BlackboardScene => ({
  id: dbScene.id,
  imagePrompt: dbScene.image_prompt || '',
  generatedImageUrl: dbScene.generated_image_url || undefined,
  imageGenerationStatus: (dbScene.image_generation_status as BlackboardScene['imageGenerationStatus']) || 'idle',
  videoPrompt: dbScene.video_prompt || '',
  generatedVideoUrl: dbScene.generated_video_url || undefined,
  videoGenerationStatus: (dbScene.video_generation_status as BlackboardScene['videoGenerationStatus']) || 'idle',
  usePreviousImageAsSeed: dbScene.use_previous_image_as_seed ?? true,
});

// Map local scene to DB format
const mapLocalSceneToDb = (scene: BlackboardScene, storyboardId: string, orderNumber: number) => ({
  id: scene.id,
  storyboard_id: storyboardId,
  order_number: orderNumber,
  image_prompt: scene.imagePrompt,
  generated_image_url: scene.generatedImageUrl || null,
  image_generation_status: scene.imageGenerationStatus,
  video_prompt: scene.videoPrompt,
  generated_video_url: scene.generatedVideoUrl || null,
  video_generation_status: scene.videoGenerationStatus,
  use_previous_image_as_seed: scene.usePreviousImageAsSeed,
});

export const useBlackboardStoryboard = () => {
  const { user } = useAuth();
  const [storyboardId, setStoryboardId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<BlackboardScene[]>([createEmptyScene(true)]);
  const [aspectRatio, setAspectRatio] = useState('hd');
  const [videoModelType, setVideoModelType] = useState<VideoModelType>('lite');
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { refetch: refetchCredits } = useUserCredits();
  const { waitForGeneration } = useBlackboardPolling();

  // Load storyboard from database on mount
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadStoryboard = async () => {
      try {
        // Check localStorage for existing storyboard ID
        const savedId = localStorage.getItem(STORAGE_KEY);
        
        if (savedId) {
          // Try to load existing storyboard
          const { data: storyboard, error: storyboardError } = await supabase
            .from('blackboard_storyboards')
            .select('*')
            .eq('id', savedId)
            .eq('user_id', user.id)
            .single();

          if (storyboard && !storyboardError) {
            setStoryboardId(storyboard.id);
            setAspectRatio(storyboard.aspect_ratio || 'hd');
            setVideoModelType((storyboard.video_model_type as VideoModelType) || 'lite');
            setFinalVideoUrl(storyboard.final_video_url || null);

            // Load scenes
            const { data: dbScenes, error: scenesError } = await supabase
              .from('blackboard_scenes')
              .select('*')
              .eq('storyboard_id', storyboard.id)
              .order('order_number', { ascending: true });

            if (dbScenes && dbScenes.length > 0 && !scenesError) {
              setScenes(dbScenes.map(mapDbSceneToLocal));
            }
            
            setIsLoading(false);
            return;
          }
        }

        // No existing storyboard found, create a new one
        const { data: newStoryboard, error: createError } = await supabase
          .from('blackboard_storyboards')
          .insert({
            user_id: user.id,
            aspect_ratio: 'hd',
            video_model_type: 'lite',
            status: 'draft',
          })
          .select()
          .single();

        if (createError) throw createError;

        if (newStoryboard) {
          setStoryboardId(newStoryboard.id);
          localStorage.setItem(STORAGE_KEY, newStoryboard.id);

          // Create initial scene
          const initialScene = createEmptyScene(true);
          const { error: sceneError } = await supabase
            .from('blackboard_scenes')
            .insert(mapLocalSceneToDb(initialScene, newStoryboard.id, 0));

          if (sceneError) throw sceneError;
          setScenes([initialScene]);
        }
      } catch (error) {
        logger.error('Failed to load blackboard storyboard', error instanceof Error ? error : new Error(String(error)), {
          component: 'useBlackboardStoryboard',
        });
        toast.error('Failed to load storyboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadStoryboard();
  }, [user]);

  // Realtime subscription for scene updates from database trigger
  // When the sync_generation_to_blackboard_scene trigger updates a scene,
  // we receive the update here and merge it into local state
  useEffect(() => {
    if (!storyboardId) return;

    const channel = supabase
      .channel(`blackboard_scenes_${storyboardId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blackboard_scenes',
          filter: `storyboard_id=eq.${storyboardId}`,
        },
        (payload) => {
          const updatedScene = payload.new as Record<string, unknown>;
          
          logger.debug('Realtime scene update received', {
            component: 'useBlackboardStoryboard',
            sceneId: updatedScene.id,
            hasImageUrl: !!updatedScene.generated_image_url,
            hasVideoUrl: !!updatedScene.generated_video_url,
          });

          // Merge the database update into local state
          setScenes(prev => prev.map(scene => {
            if (scene.id !== updatedScene.id) return scene;
            
            return {
              ...scene,
              generatedImageUrl: updatedScene.generated_image_url as string | undefined,
              imageGenerationStatus: (updatedScene.image_generation_status as string) === 'complete' ? 'complete' : 
                                     (updatedScene.image_generation_status as string) === 'failed' ? 'failed' :
                                     scene.imageGenerationStatus,
              generatedVideoUrl: updatedScene.generated_video_url as string | undefined,
              videoGenerationStatus: (updatedScene.video_generation_status as string) === 'complete' ? 'complete' :
                                     (updatedScene.video_generation_status as string) === 'failed' ? 'failed' :
                                     scene.videoGenerationStatus,
            };
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storyboardId]);

  // Debounced save to database
  const saveToDatabase = useCallback(async (
    currentScenes: BlackboardScene[],
    currentAspectRatio: string,
    currentVideoModelType: VideoModelType,
    currentFinalVideoUrl: string | null
  ) => {
    if (!storyboardId || !user) return;

    setIsSaving(true);
    try {
      // Update storyboard settings
      await supabase
        .from('blackboard_storyboards')
        .update({
          aspect_ratio: currentAspectRatio,
          video_model_type: currentVideoModelType,
          final_video_url: currentFinalVideoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', storyboardId);

      // Upsert scenes
      const scenesToUpsert = currentScenes.map((scene, index) => 
        mapLocalSceneToDb(scene, storyboardId, index)
      );

      await supabase
        .from('blackboard_scenes')
        .upsert(scenesToUpsert, { onConflict: 'id' });

      // Delete scenes that no longer exist
      const currentSceneIds = currentScenes.map(s => s.id);
      await supabase
        .from('blackboard_scenes')
        .delete()
        .eq('storyboard_id', storyboardId)
        .not('id', 'in', `(${currentSceneIds.join(',')})`);

    } catch (error) {
      logger.error('Failed to save blackboard storyboard', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
      });
    } finally {
      setIsSaving(false);
    }
  }, [storyboardId, user]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!storyboardId || isLoading) return;

    const timeoutId = setTimeout(() => {
      saveToDatabase(scenes, aspectRatio, videoModelType, finalVideoUrl);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [scenes, aspectRatio, videoModelType, finalVideoUrl, storyboardId, isLoading, saveToDatabase]);

  const addScene = useCallback(async () => {
    const newScene = createEmptyScene(false);
    setScenes(prev => [...prev, newScene]);
  }, []);

  const removeScene = useCallback((sceneId: string) => {
    setScenes(prev => {
      if (prev.length <= 1) {
        toast.error('You must have at least one scene');
        return prev;
      }
      return prev.filter(s => s.id !== sceneId);
    });
  }, []);

  // Scene updates are now handled by database trigger (sync_generation_to_blackboard_scene)
  // This function only updates local state - the trigger handles persistence
  const updateScene = useCallback((sceneId: string, updates: Partial<BlackboardScene>) => {
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, ...updates } : s));
  }, []);


  const generateSingleImage = useCallback(async (
    scene: BlackboardScene,
    sceneIndex: number,
    previousImageUrl?: string,
    storyboardAspectRatio?: string
  ): Promise<string | null> => {
    if (!scene.imagePrompt.trim()) {
      return null;
    }

    try {
      const modules = getAllModels();
      
      // Scene 1 uses T2I; Scene 2+ uses I2I if seed toggle is ON and previous image exists
      const useImageToImage = sceneIndex > 0 && scene.usePreviousImageAsSeed && !!previousImageUrl;
      const modelRecordId = useImageToImage ? IMAGE_TO_IMAGE_MODEL_ID : TEXT_TO_IMAGE_MODEL_ID;
      const modelModule = modules.find(m => m.MODEL_CONFIG.recordId === modelRecordId);
      
      if (!modelModule) {
        throw new Error('Image generation model not found');
      }

      // Map storyboard aspect ratio to model parameters
      const aspectRatioParams = storyboardAspectRatio 
        ? mapAspectRatioToModelParameters(storyboardAspectRatio, modelModule.SCHEMA)
        : {};

      // Normalize previousImageUrl to full public URL (handles both paths and URLs)
      const normalizedPreviousUrl = previousImageUrl 
        ? getPublicImageUrl(previousImageUrl) 
        : undefined;

      const body: Record<string, unknown> = {
        model_id: modelModule.MODEL_CONFIG.modelId,
        model_record_id: modelModule.MODEL_CONFIG.recordId,
        model_config: modelModule.MODEL_CONFIG,
        model_schema: modelModule.SCHEMA,
        prompt: scene.imagePrompt,
        custom_parameters: {
          ...aspectRatioParams,
          // Add image input for I2I mode - must be INSIDE custom_parameters
          ...(useImageToImage && normalizedPreviousUrl ? { image_input: [normalizedPreviousUrl] } : {}),
        },
        // Link this generation to the blackboard scene for automatic sync via database trigger
        blackboard_scene_id: scene.id,
      };

      const { data, error } = await supabase.functions.invoke('generate-content', { body });

      if (error) throw error;
      
      // Check if it's an async generation that needs polling
      if (data?.is_async && data?.generation_id) {
        // Use hybrid polling (Realtime + fallback) - 5 min timeout for images
        return await waitForGeneration(data.generation_id, 5 * 60 * 1000);
      }
      
      return data?.output_url || null;
    } catch (error) {
      logger.error('Blackboard image generation failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
        sceneId: scene.id,
      });
      return null;
    }
  }, [waitForGeneration]);

  const generateAllImages = useCallback(async () => {
    setIsGeneratingImages(true);
    
    try {
      let previousImageUrl: string | undefined;
      
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        
        if (scene.generatedImageUrl) {
          previousImageUrl = scene.generatedImageUrl;
          continue; // Skip already generated
        }
        if (!scene.imagePrompt.trim()) continue;

        updateScene(scene.id, { imageGenerationStatus: 'generating' });
        
        const imageUrl = await generateSingleImage(scene, i, previousImageUrl, aspectRatio);
        
        if (imageUrl) {
          updateScene(scene.id, { 
            generatedImageUrl: imageUrl, 
            imageGenerationStatus: 'complete' 
          });
          previousImageUrl = imageUrl; // Update for next scene
        } else {
          updateScene(scene.id, { imageGenerationStatus: 'failed' });
        }
      }

      refetchCredits();
      toast.success('Image generation complete!');
    } catch (error) {
      logger.error('Blackboard batch image generation failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
      });
      toast.error('Failed to generate images');
    } finally {
      setIsGeneratingImages(false);
    }
  }, [scenes, aspectRatio, updateScene, generateSingleImage, refetchCredits]);

  const generateSingleVideo = useCallback(async (
    scene: BlackboardScene,
    startImageUrl: string,
    endImageUrl: string,
    modelType: VideoModelType
  ): Promise<string | null> => {
    if (!scene.videoPrompt.trim()) {
      return null;
    }

    try {
      const modules = getAllModels();
      const modelRecordId = modelType === 'hq' 
        ? VIDEO_MODEL_HQ_ID 
        : VIDEO_MODEL_LITE_ID;
      const modelModule = modules.find(m => m.MODEL_CONFIG.recordId === modelRecordId);
      
      if (!modelModule) {
        throw new Error('Video generation model not found');
      }

      // Both Lite and HQ use first/last frame transition mode
      const rawImageUrls = [startImageUrl, endImageUrl];

      // Normalize image URLs to full public URLs
      const normalizedImageUrls = rawImageUrls.map(url => getPublicImageUrl(url));

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          model_id: modelModule.MODEL_CONFIG.modelId,
          model_record_id: modelModule.MODEL_CONFIG.recordId,
          model_config: modelModule.MODEL_CONFIG,
          model_schema: modelModule.SCHEMA,
          prompt: scene.videoPrompt,
          custom_parameters: {
            imageUrls: normalizedImageUrls,
            aspectRatio: "Auto", // Let Veo 3.1 auto-detect from input images
          },
          // Link this generation to the blackboard scene for automatic sync via database trigger
          blackboard_scene_id: scene.id,
        },
      });

      if (error) throw error;
      
      // Check if it's an async generation that needs polling
      if (data?.is_async && data?.generation_id) {
        // Use hybrid polling (Realtime + fallback) - 20 minute timeout for videos
        return await waitForGeneration(data.generation_id, VIDEO_GENERATION_TIMEOUT_MS);
      }
      
      return data?.output_url || null;
    } catch (error) {
      logger.error('Blackboard video generation failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
        sceneId: scene.id,
      });
      return null;
    }
  }, [waitForGeneration, aspectRatio]);

  const generateAllVideos = useCallback(async () => {
    // Validate all images are generated
    const scenesWithImages = scenes.filter(s => s.generatedImageUrl);
    if (scenesWithImages.length < 2) {
      toast.error('Need at least 2 scenes with images to generate videos');
      return;
    }

    setIsGeneratingVideos(true);
    
    try {
      // Generate N-1 videos (each video uses adjacent image pairs)
      for (let i = 0; i < scenes.length - 1; i++) {
        const currentScene = scenes[i];
        const nextScene = scenes[i + 1];

        if (!currentScene.generatedImageUrl || !nextScene.generatedImageUrl) continue;
        if (currentScene.generatedVideoUrl) continue; // Skip already generated
        if (!currentScene.videoPrompt.trim()) continue;

        updateScene(currentScene.id, { videoGenerationStatus: 'generating' });
        
        const videoUrl = await generateSingleVideo(
          currentScene,
          currentScene.generatedImageUrl,
          nextScene.generatedImageUrl,
          videoModelType
        );
        
        if (videoUrl) {
          updateScene(currentScene.id, { 
            generatedVideoUrl: videoUrl, 
            videoGenerationStatus: 'complete' 
          });
        } else {
          updateScene(currentScene.id, { videoGenerationStatus: 'failed' });
        }
      }

      refetchCredits();
      toast.success('Video generation complete!');
    } catch (error) {
      logger.error('Blackboard batch video generation failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
      });
      toast.error('Failed to generate videos');
    } finally {
      setIsGeneratingVideos(false);
    }
  }, [scenes, videoModelType, updateScene, generateSingleVideo, refetchCredits]);

  // Poll for render completion via status-blackboard-video edge function
  const pollForRenderCompletion = useCallback(async (sbId: string) => {
    const maxAttempts = 120; // 10 minutes at 5-second intervals
    let attempts = 0;
    
    const poll = async (): Promise<void> => {
      attempts++;
      
      try {
        // Call the status endpoint which polls Shotstack and updates the DB
        const { data: statusData, error } = await supabase.functions.invoke('status-blackboard-video', {
          body: { storyboardId: sbId },
        });
        
        if (error) {
          logger.error('Failed to poll storyboard status', error);
          // Continue polling on transient errors
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000);
          } else {
            setIsRendering(false);
            toast.error('Render status check failed. Please refresh the page.');
          }
          return;
        }
        
        if (statusData?.status === 'complete' && statusData.finalVideoUrl) {
          setFinalVideoUrl(statusData.finalVideoUrl);
          setIsRendering(false);
          toast.success('Video rendered successfully!');
          return;
        } else if (statusData?.status === 'failed') {
          setIsRendering(false);
          toast.error('Video rendering failed. Credits have been refunded.');
          return;
        } else if (attempts >= maxAttempts) {
          setIsRendering(false);
          toast.error('Render timed out. Please check back later.');
          return;
        }
        
        // Continue polling every 5 seconds
        setTimeout(poll, 5000);
      } catch (err) {
        logger.error('Polling error', err instanceof Error ? err : new Error(String(err)));
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setIsRendering(false);
        }
      }
    };
    
    // Start polling
    poll();
  }, []);

  const renderFinalVideo = useCallback(async (renderOptions?: {
    backgroundAudioUrl?: string;
    backgroundAudioVolume?: number;
    backgroundAudioFadeIn?: boolean;
    backgroundAudioFadeOut?: boolean;
    outroMediaUrl?: string;
    outroMediaType?: 'image' | 'video';
    outroDuration?: number;
  }) => {
    const videosToStitch = scenes
      .filter(s => s.generatedVideoUrl)
      .map(s => s.generatedVideoUrl as string);

    if (videosToStitch.length === 0) {
      toast.error('No videos to stitch. Generate videos first.');
      return;
    }

    if (!storyboardId) {
      toast.error('No storyboard ID found');
      return;
    }

    setIsRendering(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call the blackboard video stitching endpoint with render options
      const { data, error } = await supabase.functions.invoke('render-blackboard-video', {
        body: {
          storyboardId,
          backgroundAudioUrl: renderOptions?.backgroundAudioUrl,
          backgroundAudioVolume: renderOptions?.backgroundAudioVolume,
          backgroundAudioFadeIn: renderOptions?.backgroundAudioFadeIn,
          backgroundAudioFadeOut: renderOptions?.backgroundAudioFadeOut,
          outroMediaUrl: renderOptions?.outroMediaUrl,
          outroMediaType: renderOptions?.outroMediaType,
          outroDuration: renderOptions?.outroDuration,
        },
      });

      if (error) throw error;

      // Rendering is async - start polling for completion
      if (data?.renderId) {
        toast.info('Video stitching started via Shotstack. This may take a few minutes...');
        pollForRenderCompletion(storyboardId);
      } else if (data?.video_url || data?.finalVideoUrl) {
        // Immediate completion (unlikely but handle it)
        setFinalVideoUrl(data.video_url || data.finalVideoUrl);
        setIsRendering(false);
        toast.success('Video rendered successfully!');
      }

      refetchCredits();
    } catch (error) {
      logger.error('Blackboard final render failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
      });
      toast.error('Failed to render final video');
      setIsRendering(false);
    }
  }, [scenes, storyboardId, refetchCredits, pollForRenderCompletion]);

  const resetAll = useCallback(async () => {
    const initialScene = createEmptyScene(true);
    setScenes([initialScene]);
    setFinalVideoUrl(null);

    // If we have a storyboard ID, also reset in database
    if (storyboardId) {
      try {
        // Delete all existing scenes
        await supabase
          .from('blackboard_scenes')
          .delete()
          .eq('storyboard_id', storyboardId);

        // Create new initial scene
        await supabase
          .from('blackboard_scenes')
          .insert(mapLocalSceneToDb(initialScene, storyboardId, 0));

        // Reset storyboard
        await supabase
          .from('blackboard_storyboards')
          .update({
            final_video_url: null,
            status: 'draft',
            updated_at: new Date().toISOString(),
          })
          .eq('id', storyboardId);
      } catch (error) {
        logger.error('Failed to reset blackboard in database', error instanceof Error ? error : new Error(String(error)), {
          component: 'useBlackboardStoryboard',
        });
      }
    }
  }, [storyboardId]);

  // Generate a single image (for individual scene generation)
  const generateImage = useCallback(async (sceneId: string) => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    const scene = scenes[sceneIndex];
    if (!scene) return;
    
    const previousImageUrl = sceneIndex > 0 ? scenes[sceneIndex - 1].generatedImageUrl : undefined;
    
    updateScene(sceneId, { imageGenerationStatus: 'generating' });
    
    const imageUrl = await generateSingleImage(scene, sceneIndex, previousImageUrl, aspectRatio);
    
    if (imageUrl) {
      updateScene(sceneId, { 
        generatedImageUrl: imageUrl, 
        imageGenerationStatus: 'complete' 
      });
      toast.success('Image generated!');
    } else {
      updateScene(sceneId, { imageGenerationStatus: 'failed' });
      toast.error('Failed to generate image');
    }
    
    refetchCredits();
  }, [scenes, aspectRatio, updateScene, generateSingleImage, refetchCredits]);

  // Regenerate a single image (clears existing, generates fresh)
  const regenerateImage = useCallback(async (sceneId: string) => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    const scene = scenes[sceneIndex];
    if (!scene) return;
    
    const previousImageUrl = sceneIndex > 0 ? scenes[sceneIndex - 1].generatedImageUrl : undefined;
    
    updateScene(sceneId, { 
      generatedImageUrl: undefined, 
      imageGenerationStatus: 'generating' 
    });
    
    const imageUrl = await generateSingleImage(scene, sceneIndex, previousImageUrl, aspectRatio);
    
    if (imageUrl) {
      updateScene(sceneId, { 
        generatedImageUrl: imageUrl, 
        imageGenerationStatus: 'complete' 
      });
      toast.success('Image regenerated!');
    } else {
      updateScene(sceneId, { imageGenerationStatus: 'failed' });
      toast.error('Failed to regenerate image');
    }
    
    refetchCredits();
  }, [scenes, aspectRatio, updateScene, generateSingleImage, refetchCredits]);

  // Generate a single video (for individual scene generation)
  const generateVideo = useCallback(async (sceneId: string) => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    const scene = scenes[sceneIndex];
    const nextScene = scenes[sceneIndex + 1];
    
    if (!scene || !nextScene || !scene.generatedImageUrl || !nextScene.generatedImageUrl) {
      toast.error('Both adjacent images required');
      return;
    }
    
    updateScene(sceneId, { videoGenerationStatus: 'generating' });
    
    const videoUrl = await generateSingleVideo(scene, scene.generatedImageUrl, nextScene.generatedImageUrl, videoModelType);
    
    if (videoUrl) {
      updateScene(sceneId, { 
        generatedVideoUrl: videoUrl, 
        videoGenerationStatus: 'complete' 
      });
      toast.success('Video generated!');
    } else {
      updateScene(sceneId, { videoGenerationStatus: 'failed' });
      toast.error('Failed to generate video');
    }
    
    refetchCredits();
  }, [scenes, videoModelType, updateScene, generateSingleVideo, refetchCredits]);

  // Regenerate a single video (clears existing, generates fresh)
  const regenerateVideo = useCallback(async (sceneId: string) => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    const scene = scenes[sceneIndex];
    const nextScene = scenes[sceneIndex + 1];
    
    if (!scene || !nextScene || !scene.generatedImageUrl || !nextScene.generatedImageUrl) {
      toast.error('Both adjacent images required');
      return;
    }
    
    updateScene(sceneId, { 
      generatedVideoUrl: undefined, 
      videoGenerationStatus: 'generating' 
    });
    
    const videoUrl = await generateSingleVideo(scene, scene.generatedImageUrl, nextScene.generatedImageUrl, videoModelType);
    
    if (videoUrl) {
      updateScene(sceneId, { 
        generatedVideoUrl: videoUrl, 
        videoGenerationStatus: 'complete' 
      });
      toast.success('Video regenerated!');
    } else {
      updateScene(sceneId, { videoGenerationStatus: 'failed' });
      toast.error('Failed to regenerate video');
    }
    
    refetchCredits();
  }, [scenes, videoModelType, updateScene, generateSingleVideo, refetchCredits]);

  // Calculate estimated costs using actual model cost
  const imageCreditCost = NANO_BANANA_CONFIG.baseCreditCost;
  const videoCreditCost = videoModelType === 'hq' ? 125 : 30; // Veo3.1 HQ: 125, Lite: 30
  const estimatedCost = {
    images: scenes.filter(s => !s.generatedImageUrl && s.imagePrompt.trim()).length * imageCreditCost,
    videos: Math.max(0, scenes.filter(s => s.generatedImageUrl).length - 1) * videoCreditCost,
    stitching: scenes.filter(s => s.generatedVideoUrl).length * 5 * 0.25, // ~0.25 credits per second
  };

  const totalEstimatedCost = estimatedCost.images + estimatedCost.videos + estimatedCost.stitching;

  // Load a specific storyboard by ID
  const loadStoryboard = useCallback(async (targetId: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: storyboard, error: storyboardError } = await supabase
        .from('blackboard_storyboards')
        .select('*')
        .eq('id', targetId)
        .eq('user_id', user.id)
        .single();

      if (storyboardError || !storyboard) {
        toast.error('Storyboard not found');
        setIsLoading(false);
        return;
      }

      setStoryboardId(storyboard.id);
      setAspectRatio(storyboard.aspect_ratio || 'hd');
      setVideoModelType((storyboard.video_model_type as VideoModelType) || 'lite');
      setFinalVideoUrl(storyboard.final_video_url || null);
      localStorage.setItem(STORAGE_KEY, storyboard.id);

      // Load scenes
      const { data: dbScenes, error: scenesError } = await supabase
        .from('blackboard_scenes')
        .select('*')
        .eq('storyboard_id', storyboard.id)
        .order('order_number', { ascending: true });

      if (dbScenes && dbScenes.length > 0 && !scenesError) {
        setScenes(dbScenes.map(mapDbSceneToLocal));
      } else {
        // Create initial scene if none exist
        const initialScene = createEmptyScene(true);
        await supabase
          .from('blackboard_scenes')
          .insert(mapLocalSceneToDb(initialScene, storyboard.id, 0));
        setScenes([initialScene]);
      }

      toast.success('Storyboard loaded');
    } catch (error) {
      logger.error('Failed to load storyboard', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
      });
      toast.error('Failed to load storyboard');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create a new storyboard
  const createNewStoryboard = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: newStoryboard, error: createError } = await supabase
        .from('blackboard_storyboards')
        .insert({
          user_id: user.id,
          aspect_ratio: 'hd',
          video_model_type: 'first_last_frames',
          status: 'draft',
        })
        .select()
        .single();

      if (createError) throw createError;

      if (newStoryboard) {
        setStoryboardId(newStoryboard.id);
        setAspectRatio('hd');
        setVideoModelType('lite');
        setFinalVideoUrl(null);
        localStorage.setItem(STORAGE_KEY, newStoryboard.id);

        // Create initial scene
        const initialScene = createEmptyScene(true);
        await supabase
          .from('blackboard_scenes')
          .insert(mapLocalSceneToDb(initialScene, newStoryboard.id, 0));

        setScenes([initialScene]);
        toast.success('New storyboard created');
      }
    } catch (error) {
      logger.error('Failed to create new storyboard', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
      });
      toast.error('Failed to create storyboard');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Delete a storyboard
  const deleteStoryboard = useCallback(async (targetId: string) => {
    if (!user) return;

    try {
      // Delete the storyboard (scenes cascade delete)
      const { error } = await supabase
        .from('blackboard_storyboards')
        .delete()
        .eq('id', targetId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Storyboard deleted');

      // If we deleted the current storyboard, create a new one
      if (targetId === storyboardId) {
        await createNewStoryboard();
      }
    } catch (error) {
      logger.error('Failed to delete storyboard', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
      });
      toast.error('Failed to delete storyboard');
    }
  }, [user, storyboardId, createNewStoryboard]);

  // Manual check status for a scene - searches both blackboard_scenes AND generations table
  const checkSceneStatus = useCallback(async (sceneId: string) => {
    if (!storyboardId) return;
    
    try {
      // Phase 1: Check blackboard_scenes table for existing data
      const { data: sceneData, error: sceneError } = await supabase
        .from('blackboard_scenes')
        .select('generated_image_url, image_generation_status, generated_video_url, video_generation_status, image_prompt, video_prompt')
        .eq('id', sceneId)
        .single();
      
      if (sceneError) throw sceneError;
      
      let updated = false;
      let foundImageUrl: string | null = sceneData.generated_image_url || null;
      let foundVideoUrl: string | null = sceneData.generated_video_url || null;
      
      // Phase 2: Direct lookup by blackboard_scene_id (most reliable method)
      // This finds generations that were linked but database trigger didn't sync
      if (!foundImageUrl || !foundVideoUrl) {
        const { data: linkedGenerations } = await supabase
          .from('generations')
          .select('id, output_url, storage_path, status, type')
          .eq('blackboard_scene_id', sceneId)
          .eq('status', 'completed')
          .not('storage_path', 'is', null);
        
        if (linkedGenerations && linkedGenerations.length > 0) {
          for (const gen of linkedGenerations) {
            if (gen.type === 'image' && !foundImageUrl) {
              foundImageUrl = gen.storage_path;
              
              // Sync to blackboard_scenes
              await supabase
                .from('blackboard_scenes')
                .update({
                  generated_image_url: foundImageUrl,
                  image_generation_status: 'complete'
                })
                .eq('id', sceneId);
              
              updated = true;
              logger.debug('Synced linked image generation', {
                component: 'useBlackboardStoryboard',
                sceneId,
                generationId: gen.id
              });
            } else if (gen.type === 'video' && !foundVideoUrl) {
              foundVideoUrl = gen.storage_path;
              
              // Sync to blackboard_scenes
              await supabase
                .from('blackboard_scenes')
                .update({
                  generated_video_url: foundVideoUrl,
                  video_generation_status: 'complete'
                })
                .eq('id', sceneId);
              
              updated = true;
              logger.debug('Synced linked video generation', {
                component: 'useBlackboardStoryboard',
                sceneId,
                generationId: gen.id
              });
            }
          }
        }
      }
      
      // Phase 3: Fallback - search generations by prompt substring (for orphaned generations)
      if (!foundImageUrl && sceneData.image_prompt) {
        const promptSubstring = sceneData.image_prompt.substring(0, 80);
        
        const { data: generations } = await supabase
          .from('generations')
          .select('id, output_url, storage_path, prompt, status, type')
          .eq('status', 'completed')
          .eq('type', 'image')
          .not('storage_path', 'is', null)
          .ilike('prompt', `%${promptSubstring}%`)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (generations && generations.length > 0) {
          const matchingGen = generations[0];
          foundImageUrl = matchingGen.storage_path;
          
          // Update blackboard_scenes with the found URL
          await supabase
            .from('blackboard_scenes')
            .update({
              generated_image_url: foundImageUrl,
              image_generation_status: 'complete'
            })
            .eq('id', sceneId);
          
          // Backfill blackboard_scene_id on the generation
          await supabase
            .from('generations')
            .update({ blackboard_scene_id: sceneId })
            .eq('id', matchingGen.id);
          
          updated = true;
        }
      }
      
      // Phase 3b: Same for video
      if (!foundVideoUrl && sceneData.video_prompt) {
        const promptSubstring = sceneData.video_prompt.substring(0, 80);
        
        const { data: generations } = await supabase
          .from('generations')
          .select('id, output_url, storage_path, prompt, status, type')
          .eq('status', 'completed')
          .eq('type', 'video')
          .not('storage_path', 'is', null)
          .ilike('prompt', `%${promptSubstring}%`)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (generations && generations.length > 0) {
          const matchingGen = generations[0];
          foundVideoUrl = matchingGen.storage_path;
          
          await supabase
            .from('blackboard_scenes')
            .update({
              generated_video_url: foundVideoUrl,
              video_generation_status: 'complete'
            })
            .eq('id', sceneId);
          
          await supabase
            .from('generations')
            .update({ blackboard_scene_id: sceneId })
            .eq('id', matchingGen.id);
          
          updated = true;
        }
      }
      
      // Phase 4: Update local state
      setScenes(prev => prev.map(scene => {
        if (scene.id !== sceneId) return scene;
        
        const updates: Partial<BlackboardScene> = {};
        
        if (foundImageUrl && !scene.generatedImageUrl) {
          updates.generatedImageUrl = foundImageUrl;
          updates.imageGenerationStatus = 'complete';
          updated = true;
        }
        
        if (foundVideoUrl && !scene.generatedVideoUrl) {
          updates.generatedVideoUrl = foundVideoUrl;
          updates.videoGenerationStatus = 'complete';
          updated = true;
        }
        
        // Fix stuck generating status
        if (scene.imageGenerationStatus === 'generating' && foundImageUrl) {
          updates.imageGenerationStatus = 'complete';
          updates.generatedImageUrl = foundImageUrl;
          updated = true;
        }
        
        if (scene.videoGenerationStatus === 'generating' && foundVideoUrl) {
          updates.videoGenerationStatus = 'complete';
          updates.generatedVideoUrl = foundVideoUrl;
          updated = true;
        }
        
        return Object.keys(updates).length > 0 ? { ...scene, ...updates } : scene;
      }));
      
      if (updated) {
        toast.success('Found and synced completed generation!');
      } else {
        // Check if there's a pending generation
        const promptToCheck = sceneData.image_prompt?.substring(0, 80) || sceneData.video_prompt?.substring(0, 80) || '';
        if (promptToCheck) {
          // First check by blackboard_scene_id for pending
          const { data: pendingBySceneId } = await supabase
            .from('generations')
            .select('id, status')
            .eq('blackboard_scene_id', sceneId)
            .in('status', ['pending', 'processing'])
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (pendingBySceneId && pendingBySceneId.length > 0) {
            toast.info(`Generation still in progress (status: ${pendingBySceneId[0].status})`);
          } else {
            // Fallback to prompt-based search
            const { data: pendingGen } = await supabase
              .from('generations')
              .select('id, status')
              .ilike('prompt', `%${promptToCheck}%`)
              .in('status', ['pending', 'processing'])
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (pendingGen && pendingGen.length > 0) {
              toast.info(`Generation still in progress (status: ${pendingGen[0].status})`);
            } else {
              toast.info('No completed generation found - try regenerating');
            }
          }
        } else {
          toast.info('Scene is up to date');
        }
      }
    } catch (error) {
      logger.error('Failed to check scene status', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
        sceneId,
      });
      toast.error('Failed to check status');
    }
  }, [storyboardId]);

  return {
    scenes,
    aspectRatio,
    setAspectRatio,
    videoModelType,
    setVideoModelType,
    addScene,
    removeScene,
    updateScene,
    generateAllImages,
    generateAllVideos,
    renderFinalVideo,
    resetAll,
    generateImage,
    regenerateImage,
    generateVideo,
    regenerateVideo,
    checkSceneStatus,
    isGeneratingImages,
    isGeneratingVideos,
    isRendering,
    finalVideoUrl,
    estimatedCost,
    totalEstimatedCost,
    imageCreditCost,
    videoCreditCost,
    isLoading,
    isSaving,
    storyboardId,
    loadStoryboard,
    createNewStoryboard,
    deleteStoryboard,
  };
};
