import { useState, useEffect } from "react";
import { useOnboarding } from "./useOnboarding";
import type { TemplatePreview } from "@/types/templates";

/**
 * Hook to orchestrate onboarding flow for Create page
 * Simplified for the new 8-step onboarding system
 */
export const useOnboardingFlow = (
  _selectedTemplate: TemplatePreview | null,
  _prompt: string,
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
    }
  }, [progress, isLoading, showWelcome]);
  
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
