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
    viewedTemplates: boolean; // Track when user lands on Create page
    selectedTemplate: boolean; // Track when user selects a template OR model
    enteredPrompt: boolean; // Track when user enters prompt (>10 chars)
    viewedTokenCost: boolean; // Track when user views generation dialog with cost
    completedFirstGeneration: boolean; // Track when first generation completes
    viewedResult: boolean; // Track when user views output
    downloadedResult: boolean; // Track when user downloads result
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
            viewedTemplates: false,
            selectedTemplate: false,
            enteredPrompt: false,
            viewedTokenCost: false,
            completedFirstGeneration: false,
            viewedResult: false,
            downloadedResult: false,
          },
          completedCount: 0,
          totalCount: 7,
          bonusAwarded: false,
          firstGenerationId: null,
        } as OnboardingProgress;
      }

      const checklist = {
        viewedTemplates: data.viewed_templates,
        selectedTemplate: data.selected_template,
        enteredPrompt: data.entered_prompt,
        viewedTokenCost: data.viewed_token_cost,
        completedFirstGeneration: data.completed_first_generation,
        viewedResult: data.viewed_result,
        downloadedResult: data.downloaded_result,
      };

      const completedCount = Object.values(checklist).filter(Boolean).length;

      return {
        isNewUser,
        isComplete: data.is_complete,
        dismissed: data.dismissed,
        checklist,
        completedCount,
        totalCount: 7,
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
      if (updates.viewedTemplates !== undefined) dbUpdates.viewed_templates = updates.viewedTemplates;
      if (updates.selectedTemplate !== undefined) dbUpdates.selected_template = updates.selectedTemplate;
      if (updates.enteredPrompt !== undefined) dbUpdates.entered_prompt = updates.enteredPrompt;
      if (updates.viewedTokenCost !== undefined) dbUpdates.viewed_token_cost = updates.viewedTokenCost;
      if (updates.completedFirstGeneration !== undefined) dbUpdates.completed_first_generation = updates.completedFirstGeneration;
      if (updates.viewedResult !== undefined) dbUpdates.viewed_result = updates.viewedResult;
      if (updates.downloadedResult !== undefined) dbUpdates.downloaded_result = updates.downloadedResult;

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
