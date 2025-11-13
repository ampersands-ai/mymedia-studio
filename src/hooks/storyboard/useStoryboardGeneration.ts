import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

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

export const useStoryboardGeneration = (
  setAndPersistStoryboardId: (id: string | null) => void,
  setActiveSceneId: (id: string | null) => void
) => {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

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
    onError: (error: Error) => {
      logger.error('Storyboard generation failed', error, {
        component: 'useStoryboardGeneration',
        operation: 'generateMutation'
      });
      const errorMessage = error?.message || 'Failed to generate storyboard';
      toast.error(errorMessage, {
        description: 'Please check your credits and try again',
        duration: 5000
      });
      setIsGenerating(false);
    },
  });

  const generateStoryboard = useCallback(async (input: StoryboardInput) => {
    setIsGenerating(true);
    // Clear the old storyboard ID BEFORE generating
    setAndPersistStoryboardId(null);
    setActiveSceneId(null);
    
    try {
      toast.loading('Generating storyboard...', { id: 'generate-storyboard' });
      await generateMutation.mutateAsync(input);
      toast.success('Storyboard generated successfully!', { id: 'generate-storyboard' });
    } catch (error) {
      logger.error('Storyboard generation error', error as Error, {
        component: 'useStoryboardGeneration',
        operation: 'generateStoryboard',
        topic: input.topic,
        duration: input.duration
      });
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
  }, [generateMutation, setAndPersistStoryboardId, setActiveSceneId]);

  return {
    isGenerating,
    generateStoryboard,
  };
};

export type { StoryboardInput };
