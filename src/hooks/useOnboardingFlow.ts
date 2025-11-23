import { useState, useEffect } from "react";
import { useOnboarding } from "./useOnboarding";
import type { TemplatePreview } from "@/types/templates";

/**
 * Hook to orchestrate onboarding flow for Create page
 * @param selectedTemplate - Currently selected template
 * @param prompt - Current prompt value
 * @param onTemplateSelect - Callback when template is selected
 */
export const useOnboardingFlow = (
  selectedTemplate: TemplatePreview | null,
  prompt: string,
  onTemplateSelect: (template: TemplatePreview, prompt: string) => void
) => {
  const { 
    progress, 
    updateProgress, 
    markComplete, 
    dismiss, 
    setFirstGeneration, 
    isLoading 
  } = useOnboarding();

  const [showWelcome, setShowWelcome] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Show welcome modal for new users
  useEffect(() => {
    if (progress && !isLoading && progress.isNewUser && !progress.dismissed && !showWelcome) {
      setShowWelcome(true);
      updateProgress({ viewedTemplates: true });
    }
  }, [progress, isLoading, showWelcome, updateProgress]);
  
  // Track prompt entry
  useEffect(() => {
    if (prompt.trim().length > 10 && progress && !progress.checklist.enteredPrompt) {
      updateProgress({ enteredPrompt: true });
    }
  }, [prompt, progress, updateProgress]);
  
  /**
   * Handle template selection from welcome modal
   */
  const handleWelcomeSelectTemplate = (template: TemplatePreview, examplePrompt: string) => {
    onTemplateSelect(template, examplePrompt);
  };
  
  return {
    progress,
    showWelcome,
    setShowWelcome,
    showConfetti,
    setShowConfetti,
    updateProgress,
    markComplete,
    dismiss,
    setFirstGeneration,
    handleWelcomeSelectTemplate,
  };
};
