import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserCredits } from '@/hooks/useUserCredits';
import { getAllModels } from '@/lib/models/registry';
import { logger } from '@/lib/logger';
import { mapAspectRatioToModelParameters } from '@/lib/aspect-ratio-mapper';
import { MODEL_CONFIG as NANO_BANANA_CONFIG } from '@/lib/models/locked/prompt_to_image/Nano_Banana_Pro';

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
const VIDEO_MODEL_ID = '6e8a863e-8630-4eef-bdbb-5b41f4c883f9'; // Google Veo 3.1 Reference

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

export const useBlackboardStoryboard = () => {
  const [scenes, setScenes] = useState<BlackboardScene[]>([createEmptyScene(true)]);
  const [aspectRatio, setAspectRatio] = useState('hd');
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const { refetch: refetchCredits } = useUserCredits();

  const addScene = useCallback(() => {
    setScenes(prev => [...prev, createEmptyScene(false)]);
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

      const body: Record<string, unknown> = {
        model_id: modelModule.MODEL_CONFIG.modelId,
        model_record_id: modelModule.MODEL_CONFIG.recordId,
        model_config: modelModule.MODEL_CONFIG,
        model_schema: modelModule.SCHEMA,
        prompt: scene.imagePrompt,
        custom_parameters: {
          ...aspectRatioParams,
        },
      };

      // Add image input for I2I mode
      if (useImageToImage && previousImageUrl) {
        body.image_input = [previousImageUrl];
      }

      const { data, error } = await supabase.functions.invoke('generate-content', { body });

      if (error) throw error;
      return data?.output_url || null;
    } catch (error) {
      logger.error('Blackboard image generation failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
        sceneId: scene.id,
      });
      return null;
    }
  }, []);

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
    endImageUrl: string
  ): Promise<string | null> => {
    if (!scene.videoPrompt.trim()) {
      return null;
    }

    try {
      const modules = getAllModels();
      const modelModule = modules.find(m => m.MODEL_CONFIG.recordId === VIDEO_MODEL_ID);
      
      if (!modelModule) {
        throw new Error('Video generation model not found');
      }

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          model_id: modelModule.MODEL_CONFIG.modelId,
          model_record_id: modelModule.MODEL_CONFIG.recordId,
          model_config: modelModule.MODEL_CONFIG,
          model_schema: modelModule.SCHEMA,
          prompt: scene.videoPrompt,
          imageUrls: [startImageUrl, endImageUrl],
        },
      });

      if (error) throw error;
      return data?.output_url || null;
    } catch (error) {
      logger.error('Blackboard video generation failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useBlackboardStoryboard',
        sceneId: scene.id,
      });
      return null;
    }
  }, []);

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
          nextScene.generatedImageUrl
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
  }, [scenes, updateScene, generateSingleVideo, refetchCredits]);

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

  const resetAll = useCallback(() => {
    setScenes([createEmptyScene(true)]);
    setFinalVideoUrl(null);
  }, []);

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
    
    const videoUrl = await generateSingleVideo(scene, scene.generatedImageUrl, nextScene.generatedImageUrl);
    
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
  }, [scenes, updateScene, generateSingleVideo, refetchCredits]);

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
    
    const videoUrl = await generateSingleVideo(scene, scene.generatedImageUrl, nextScene.generatedImageUrl);
    
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
  }, [scenes, updateScene, generateSingleVideo, refetchCredits]);

  // Calculate estimated costs using actual model cost
  const imageCreditCost = NANO_BANANA_CONFIG.baseCreditCost;
  const estimatedCost = {
    images: scenes.filter(s => !s.generatedImageUrl && s.imagePrompt.trim()).length * imageCreditCost,
    videos: Math.max(0, scenes.filter(s => s.generatedImageUrl).length - 1) * 50, // ~50 credits per video
    stitching: scenes.filter(s => s.generatedVideoUrl).length * 5 * 0.25, // ~0.25 credits per second
  };

  const totalEstimatedCost = estimatedCost.images + estimatedCost.videos + estimatedCost.stitching;

  return {
    scenes,
    aspectRatio,
    setAspectRatio,
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
  };
};
