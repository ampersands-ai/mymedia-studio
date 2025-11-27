import { useCallback } from "react";
import { getWorkflowSurpriseMePrompt } from "@/data/surpriseMePrompts";
import { toast } from "sonner";
import { logger } from '@/lib/logger';

/**
 * Hook to handle "Surprise Me" functionality for workflow templates
 * Generates random prompts based on workflow category
 */
export const useWorkflowSurpriseMe = (category: string) => {
  const getSurprisePrompt = useCallback(() => {
    try {
      const surprisePrompt = getWorkflowSurpriseMePrompt(category);
      toast.success("Random prompt loaded!");
      return surprisePrompt;
    } catch (error) {
      logger.error('Surprise prompt generation failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useWorkflowSurpriseMe',
        operation: 'getSurprisePrompt',
        category
      });
      toast.error("Failed to load prompt. Please try again.");
      return null;
    }
  }, [category]);

  return { getSurprisePrompt };
};
