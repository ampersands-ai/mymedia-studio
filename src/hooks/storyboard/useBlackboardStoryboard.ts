import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserCredits } from '@/hooks/useUserCredits';
import { getAllModels } from '@/lib/models/registry';
import { logger } from '@/lib/logger';

export interface BlackboardScene {
  id: string;
  imagePrompt: string;
  imageModelId: string;
  generatedImageUrl?: string;
  imageGenerationStatus: 'idle' | 'generating' | 'complete' | 'failed';
  
  videoPrompt: string;
  videoModelId: string;
  generatedVideoUrl?: string;
  videoGenerationStatus: 'idle' | 'generating' | 'complete' | 'failed';
}

// Default model record IDs
const DEFAULT_IMAGE_MODEL_ID = 'c5d6e7f8-9a0b-1c2d-3e4f-5a6b7c8d9e0f'; // Nano Banana Pro
const DEFAULT_VIDEO_MODEL_ID = '6e8a863e-8630-4eef-bdbb-5b41f4c883f9'; // Google Veo 3.1 Reference

export const createEmptyScene = (): BlackboardScene => ({
  id: crypto.randomUUID(),
  imagePrompt: '',
  imageModelId: DEFAULT_IMAGE_MODEL_ID,
  generatedImageUrl: undefined,
  imageGenerationStatus: 'idle',
  videoPrompt: '',
  videoModelId: DEFAULT_VIDEO_MODEL_ID,
  generatedVideoUrl: undefined,
  videoGenerationStatus: 'idle',
});

export const useBlackboardStoryboard = () => {
  const [scenes, setScenes] = useState<BlackboardScene[]>([createEmptyScene()]);
  const [aspectRatio, setAspectRatio] = useState('hd');
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const { refetch: refetchCredits } = useUserCredits();

  const addScene = useCallback(() => {
    setScenes(prev => [...prev, createEmptyScene()]);
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

  const generateSingleImage = useCallback(async (scene: BlackboardScene): Promise<string | null> => {
    if (!scene.imagePrompt.trim()) {
      return null;
    }

    try {
      const modules = getAllModels();
      const modelModule = modules.find(m => m.MODEL_CONFIG.recordId === scene.imageModelId);
      
      if (!modelModule) {
        throw new Error('Image generation model not found');
      }

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          model_id: modelModule.MODEL_CONFIG.modelId,
          model_record_id: modelModule.MODEL_CONFIG.recordId,
          model_config: modelModule.MODEL_CONFIG,
          model_schema: modelModule.SCHEMA,
          prompt: scene.imagePrompt,
        },
      });

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
      for (const scene of scenes) {
        if (scene.generatedImageUrl) continue; // Skip already generated
        if (!scene.imagePrompt.trim()) continue;

        updateScene(scene.id, { imageGenerationStatus: 'generating' });
        
        const imageUrl = await generateSingleImage(scene);
        
        if (imageUrl) {
          updateScene(scene.id, { 
            generatedImageUrl: imageUrl, 
            imageGenerationStatus: 'complete' 
          });
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
  }, [scenes, updateScene, generateSingleImage, refetchCredits]);

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
      const modelModule = modules.find(m => m.MODEL_CONFIG.recordId === scene.videoModelId);
      
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
    setScenes([createEmptyScene()]);
    setFinalVideoUrl(null);
  }, []);

  // Calculate estimated costs
  const estimatedCost = {
    images: scenes.filter(s => !s.generatedImageUrl && s.imagePrompt.trim()).length * 5, // ~5 credits per image
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
    isGeneratingImages,
    isGeneratingVideos,
    isRendering,
    finalVideoUrl,
    estimatedCost,
    totalEstimatedCost,
  };
};
