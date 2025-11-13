import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

interface CustomScene {
  voiceOverText: string;
  imagePrompt: string;
  imageUrl?: string;
}

interface CreateCustomStoryboardInput {
  scenes: CustomScene[];
  aspectRatio: string;
}

export const useCustomStoryboard = () => {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const createCustomStoryboard = useCallback(async (input: CreateCustomStoryboardInput) => {
    setIsCreating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate total duration (5 seconds per scene)
      const duration = input.scenes.length * 5;

      // Create the storyboard record
      const { data: storyboard, error: storyboardError } = await supabase
        .from('storyboards')
        .insert({
          user_id: user.id,
          topic: 'Custom Storyboard',
          duration,
          style: 'custom',
          tone: 'neutral',
          voice_id: '21m00Tcm4TlvDq8ikWAM', // Default voice (Rachel)
          voice_name: 'Rachel',
          intro_image_prompt: input.scenes[0]?.imagePrompt || '',
          intro_voiceover_text: input.scenes[0]?.voiceOverText || '',
          intro_image_preview_url: input.scenes[0]?.imageUrl || null,
          status: 'draft',
          tokens_cost: 0, // No AI generation cost for custom
          estimated_render_cost: duration * 1.5, // Estimate based on duration
          aspect_ratio: input.aspectRatio,
          video_quality: 'hd',
        })
        .select()
        .single();

      if (storyboardError) throw storyboardError;

      // Create scene records
      const sceneRecords = input.scenes.map((scene, index) => ({
        storyboard_id: storyboard.id,
        order_number: index + 1,
        voice_over_text: scene.voiceOverText,
        image_prompt: scene.imagePrompt,
        image_preview_url: scene.imageUrl || null,
        is_edited: false,
      }));

      const { error: scenesError } = await supabase
        .from('storyboard_scenes')
        .insert(sceneRecords);

      if (scenesError) throw scenesError;

      // Store the storyboard ID in localStorage
      localStorage.setItem('currentStoryboardId', storyboard.id);

      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['storyboard', storyboard.id] });
      await queryClient.invalidateQueries({ queryKey: ['storyboard-scenes', storyboard.id] });

      toast.success('Custom storyboard created!', {
        description: 'Now customize voice and caption settings, then render your video.',
      });
    } catch (error) {
      logger.error('Custom storyboard creation failed', error as Error, {
        component: 'useCustomStoryboard',
        operation: 'createCustomStoryboard',
        sceneCount: input.scenes.length,
        aspectRatio: input.aspectRatio
      });
      toast.error(error?.message || 'Failed to create custom storyboard');
    } finally {
      setIsCreating(false);
    }
  }, [queryClient]);

  return {
    createCustomStoryboard,
    isCreating,
  };
};
