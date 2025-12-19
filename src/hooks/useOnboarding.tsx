import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface OnboardingProgress {
  isNewUser: boolean;
  isComplete: boolean;
  dismissed: boolean;
  checklist: {
    navigatedToTextToImage: boolean;  // Step 1: Go to Text to Image section
    selectedZImage: boolean;          // Step 2: Select Z-Image model
    clickedSurpriseMe: boolean;       // Step 3: Click Surprise Me
    clickedEnhancePrompt: boolean;    // Step 4: Click Enhance Prompt
    clickedGenerateCaption: boolean;  // Step 5: Enable Generate Caption
    clickedGenerate: boolean;         // Step 6: Click Generate
    downloadedResult: boolean;        // Step 7: Download result
    visitedMyCreations: boolean;      // Step 8: Visit My Creations
  };
  completedCount: number;
  totalCount: number;
  bonusAwarded: boolean;
  firstGenerationId: string | null;
}

export const useOnboarding = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch onboarding progress
  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching onboarding progress', error instanceof Error ? error : new Error(String(error)), {
          component: 'useOnboarding',
          operation: 'queryFn',
          userId: user?.id
        });
        return null;
      }

      // Check if user has any generations to determine if they're new
      const { count } = await supabase
        .from('generations')
        // @ts-expect-error Supabase types don't include count option overload
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const isNewUser = (count || 0) === 0;

      // If no onboarding record exists, return default state
      if (!data) {
        return {
          isNewUser,
          isComplete: false,
          dismissed: false,
          checklist: {
            navigatedToTextToImage: false,
            selectedZImage: false,
            clickedSurpriseMe: false,
            clickedEnhancePrompt: false,
            clickedGenerateCaption: false,
            clickedGenerate: false,
            downloadedResult: false,
            visitedMyCreations: false,
          },
          completedCount: 0,
          totalCount: 8,
          bonusAwarded: false,
          firstGenerationId: null,
        } as OnboardingProgress;
      }

      const checklist = {
        navigatedToTextToImage: data.navigated_to_text_to_image ?? false,
        selectedZImage: data.selected_z_image ?? false,
        clickedSurpriseMe: data.clicked_surprise_me ?? false,
        clickedEnhancePrompt: data.clicked_enhance_prompt ?? false,
        clickedGenerateCaption: data.clicked_generate_caption ?? false,
        clickedGenerate: data.clicked_generate ?? false,
        downloadedResult: data.downloaded_result ?? false,
        visitedMyCreations: data.visited_my_creations ?? false,
      };

      const completedCount = Object.values(checklist).filter(Boolean).length;

      return {
        isNewUser,
        isComplete: data.is_complete,
        dismissed: data.dismissed,
        checklist,
        completedCount,
        totalCount: 8,
        bonusAwarded: data.bonus_awarded,
        firstGenerationId: data.first_generation_id,
      } as OnboardingProgress;
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('onboarding-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_onboarding_progress',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['onboarding-progress', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (updates: Partial<OnboardingProgress['checklist']>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const dbUpdates: Record<string, boolean> = {};
      if (updates.navigatedToTextToImage !== undefined) dbUpdates.navigated_to_text_to_image = updates.navigatedToTextToImage;
      if (updates.selectedZImage !== undefined) dbUpdates.selected_z_image = updates.selectedZImage;
      if (updates.clickedSurpriseMe !== undefined) dbUpdates.clicked_surprise_me = updates.clickedSurpriseMe;
      if (updates.clickedEnhancePrompt !== undefined) dbUpdates.clicked_enhance_prompt = updates.clickedEnhancePrompt;
      if (updates.clickedGenerateCaption !== undefined) dbUpdates.clicked_generate_caption = updates.clickedGenerateCaption;
      if (updates.clickedGenerate !== undefined) dbUpdates.clicked_generate = updates.clickedGenerate;
      if (updates.downloadedResult !== undefined) dbUpdates.downloaded_result = updates.downloadedResult;
      if (updates.visitedMyCreations !== undefined) dbUpdates.visited_my_creations = updates.visitedMyCreations;

      const { error } = await supabase
        .from('user_onboarding_progress')
        .update(dbUpdates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress', user?.id] });
    },
  });

  // Mark complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_onboarding_progress')
        .update({ is_complete: true, bonus_awarded: true })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('🎉 Congratulations! You earned 2 bonus credits!', {
        description: 'Complete your profile for another 2 credits.',
        duration: 5000,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-tokens'] });
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_onboarding_progress')
        .update({ dismissed: true })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress', user?.id] });
    },
  });

  // Set first generation ID
  const setFirstGenerationMutation = useMutation({
    mutationFn: async (generationId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_onboarding_progress')
        .update({ first_generation_id: generationId })
        .eq('user_id', user.id);

      if (error) throw error;
    },
  });

  return {
    progress: progress || null,
    updateProgress: updateProgressMutation.mutate,
    markComplete: markCompleteMutation.mutate,
    dismiss: dismissMutation.mutate,
    setFirstGeneration: setFirstGenerationMutation.mutate,
    isLoading,
  };
};
