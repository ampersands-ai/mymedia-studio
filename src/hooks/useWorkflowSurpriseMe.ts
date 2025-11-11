import { useCallback } from "react";
import { getWorkflowSurpriseMePrompt } from "@/data/surpriseMePrompts";
import { toast } from "sonner";

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
      console.error("Error generating surprise prompt:", error);
      toast.error("Failed to load prompt. Please try again.");
      return null;
    }
  }, [category]);

  return { getSurprisePrompt };
};
