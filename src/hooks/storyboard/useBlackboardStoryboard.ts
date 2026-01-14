import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserCredits } from '@/hooks/useUserCredits';
import { getAllModels } from '@/lib/models/registry';
import { logger } from '@/lib/logger';
import { mapAspectRatioToModelParameters } from '@/lib/aspect-ratio-mapper';
import { MODEL_CONFIG as NANO_BANANA_CONFIG } from '@/lib/models/locked/prompt_to_image/Nano_Banana_Pro';
import { useBlackboardPolling } from './useBlackboardPolling';
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
const VIDEO_MODEL_REFERENCE_ID = '6e8a863e-8630-4eef-bdbb-5b41f4c883f9'; // Google Veo 3.1 Reference
const VIDEO_MODEL_FIRST_LAST_ID = '8aac94cb-5625-47f4-880c-4f0fd8bd83a1'; // Google Veo 3.1 Fast (Image-to-Video)

const STORAGE_KEY = 'blackboard_storyboard_id';

export type VideoModelType = 'reference' | 'first_last_frames';

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
  const [videoModelType, setVideoModelType] = useState<VideoModelType>('first_last_frames');
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
            setVideoModelType((storyboard.video_model_type as VideoModelType) || 'first_last_frames');
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
            video_model_type: 'first_last_frames',
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
      };

      const { data, error } = await supabase.functions.invoke('generate-content', { body });

      if (error) throw error;
      
      // Check if it's an async generation that needs polling
      if (data?.is_async && data?.generation_id) {
        // Use hybrid polling (Realtime + fallback) - 90s timeout for images
        return await waitForGeneration(data.generation_id, 90000);
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
      const modelRecordId = modelType === 'reference' 
        ? VIDEO_MODEL_REFERENCE_ID 
        : VIDEO_MODEL_FIRST_LAST_ID;
      const modelModule = modules.find(m => m.MODEL_CONFIG.recordId === modelRecordId);
      
      if (!modelModule) {
        throw new Error('Video generation model not found');
      }

      // For reference mode - use single image as style reference
      // For first/last frame mode - use both images in order
      const rawImageUrls = modelType === 'reference' 
        ? [startImageUrl] 
        : [startImageUrl, endImageUrl];

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
            aspectRatio: aspectRatio === 'hd' ? '16:9' : '9:16',
          },
        },
      });

      if (error) throw error;
      
      // Check if it's an async generation that needs polling
      if (data?.is_async && data?.generation_id) {
        // Use hybrid polling (Realtime + fallback) - 10 minute timeout for videos
        return await waitForGeneration(data.generation_id, 600000);
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

  const renderFinalVideo = useCallback(async () => {
    const videosToStitch = scenes
      .filter(s => s.generatedVideoUrl)
      .map(s => s.generatedVideoUrl as string);

    if (videosToStitch.length === 0) {
      toast.error('No videos to stitch. Generate videos first.');
      return;
    }

    setIsRendering(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call the video stitching endpoint
      const { data, error } = await supabase.functions.invoke('render-video-editor', {
        body: {
          clips: videosToStitch.map((url, index) => ({
            type: 'video',
            url,
            start: index * 5,
            duration: 5,
          })),
          resolution: aspectRatio === 'hd' ? '1920x1080' : '1080x1920',
          format: 'mp4',
        },
      });

      if (error) throw error;

      if (data?.video_url) {
        setFinalVideoUrl(data.video_url);
        toast.success('Video rendered successfully!');
      }

      refetchCredits();
    } catch (error) {
      logger.error('Blackboard final render failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
      });
      toast.error('Failed to render final video');
    } finally {
      setIsRendering(false);
    }
  }, [scenes, aspectRatio, refetchCredits]);

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
  const videoCreditCost = 30; // Both Veo3 models cost 30 credits
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
      setVideoModelType((storyboard.video_model_type as VideoModelType) || 'first_last_frames');
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
        setVideoModelType('first_last_frames');
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
