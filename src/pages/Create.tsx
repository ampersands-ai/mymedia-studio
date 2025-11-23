import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTemplatesByCategory } from "@/hooks/useTemplates";
import { useUserTokens } from "@/hooks/useUserTokens";
import { useGenerationState } from "@/hooks/useGenerationState";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { useGenerationActions } from "@/hooks/useGenerationActions";
import { useOnboardingFlow } from "@/hooks/useOnboardingFlow";
import { useSEO } from "@/hooks/useSEO";
import { CreatePageHeader } from "@/components/create/CreatePageHeader";
import { TemplateGallery } from "@/components/create/TemplateGallery";
import { GenerationDialog } from "@/components/create/GenerationDialog";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { SuccessConfetti } from "@/components/onboarding/SuccessConfetti";
import { CREATE_PAGE_SEO } from "@/constants/seo";
import { TOAST_IDS } from "@/constants/generation";
import type { ContentTemplate } from "@/hooks/useTemplates";
import { clientLogger } from "@/lib/logging/client-logger";

/**
 * Main Create page component
 * Displays template gallery and manages generation workflow
 */
const Create = () => {
  const navigate = useNavigate();
  
  // Data fetching
  const { templatesByCategory, isLoading } = useTemplatesByCategory();
  const { data: userTokenData } = useUserTokens();
  const userTokens = userTokenData?.tokens_remaining || 0;
  
  // State management
  const { state, updateState, resetGenerationState, setTemplate, setPrompt } = useGenerationState();
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Polling with callbacks
  const { startPolling, isPolling, pollingId } = useGenerationPolling({
    onComplete: (outputs) => {
      clientLogger.activity({
        activityType: 'generation',
        activityName: 'generation_complete',
        routeName: 'Create',
        metadata: {
          generationId: pollingId,
          outputCount: outputs.length,
          hasValidPaths: outputs.every(o => !!o.storage_path)
        }
      });
      
      if (outputs.length === 0) {
        clientLogger.error(new Error('No outputs received after completion'), {
          routeName: 'Create',
          metadata: {
            generationId: pollingId
          }
        });
        toast.error('Generation completed but outputs not ready. Check History.', {
          id: TOAST_IDS.GENERATION_PROGRESS,
          action: {
            label: 'View History',
            onClick: () => navigate('/dashboard/history')
          }
        });
        return;
      }
      
      updateState({
        outputs,
        currentOutput: outputs[0]?.storage_path || null,
        completeTime: Date.now(),
        pollingId: null,
      });
      toast.success('Generation complete!', { id: TOAST_IDS.GENERATION_PROGRESS });
      
      // Onboarding tracking
      if (onboardingFlow.progress && !onboardingFlow.progress.checklist.completedFirstGeneration) {
        onboardingFlow.updateProgress({ completedFirstGeneration: true });
        onboardingFlow.setFirstGeneration(pollingId!);
        onboardingFlow.setShowConfetti(true);
      }
      
      // Track viewing result
      if (onboardingFlow.progress && !onboardingFlow.progress.checklist.viewedResult && outputs.length > 0) {
        onboardingFlow.updateProgress({ viewedResult: true });
      }
    },
    onError: (error) => {
      toast.error('Generation failed', { 
        id: TOAST_IDS.GENERATION_PROGRESS, 
        description: error 
      });
    },
    onTimeout: () => {
      toast.info('Generation is taking longer than expected.', {
        id: TOAST_IDS.GENERATION_PROGRESS,
        description: 'Check History for updates.',
        action: { 
          label: 'View History', 
          onClick: () => navigate('/dashboard/history') 
        },
      });
    },
  });
  
  // Onboarding flow
  const onboardingFlow = useOnboardingFlow(
    state.selectedTemplate,
    state.prompt,
    (template, prompt) => {
      setTemplate(template, prompt);
      setDialogOpen(true);
    }
  );
  
  // Actions
  const { handleGenerate, handleRetry, handleDownload, handleDownloadAll, isGenerating } = useGenerationActions({
    generationState: state,
    updateGenerationState: updateState,
    startPolling,
    onboardingProgress: onboardingFlow.progress,
    updateOnboardingProgress: onboardingFlow.updateProgress,
    setFirstGeneration: onboardingFlow.setFirstGeneration,
    setShowConfetti: onboardingFlow.setShowConfetti,
  });
  
  // SEO
  useSEO(CREATE_PAGE_SEO);
  
  // Track viewing template gallery
  useEffect(() => {
    if (onboardingFlow.progress && !onboardingFlow.progress.checklist.viewedTemplates) {
      onboardingFlow.updateProgress({ viewedTemplates: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingFlow.progress, onboardingFlow.updateProgress]);
  
  // Handlers
  const handleTemplateSelect = (template: ContentTemplate) => {
    setTemplate(template);
    resetGenerationState();
    setDialogOpen(true);
    
    // Track template selection
    if (onboardingFlow.progress && !onboardingFlow.progress.checklist.selectedTemplate) {
      onboardingFlow.updateProgress({ selectedTemplate: true });
    }
    
    // Track viewed token cost when dialog opens
    if (onboardingFlow.progress && !onboardingFlow.progress.checklist.viewedTokenCost) {
      onboardingFlow.updateProgress({ viewedTokenCost: true });
    }
  };
  
  const handleViewHistory = () => {
    setDialogOpen(false);
    navigate("/dashboard/history");
  };
  
  // Empty state
  if (!isLoading && (!templatesByCategory || Object.keys(templatesByCategory).length === 0)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-4xl font-black mb-4">NO TEMPLATES AVAILABLE</h2>
          <p className="text-lg text-muted-foreground">Please contact your administrator to add templates.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <CreatePageHeader />
        
        <TemplateGallery
          templatesByCategory={templatesByCategory}
          onTemplateSelect={handleTemplateSelect}
          isLoading={isLoading}
        />
        
        <GenerationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          selectedTemplate={state.selectedTemplate}
          prompt={state.prompt}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          isPolling={isPolling}
          userTokens={userTokens}
          onboardingProgress={onboardingFlow.progress}
          updateOnboardingProgress={onboardingFlow.updateProgress}
          generationState={state}
          onDownload={handleDownload}
          onDownloadAll={handleDownloadAll}
          onViewHistory={handleViewHistory}
          onRetry={handleRetry}
        />
        
        {/* Onboarding Components */}
        <WelcomeModal
          isOpen={onboardingFlow.showWelcome}
          onClose={() => {
            onboardingFlow.setShowWelcome(false);
            onboardingFlow.dismiss();
          }}
        />
        
        {onboardingFlow.progress && 
         !onboardingFlow.progress.isComplete && 
         !onboardingFlow.progress.dismissed && (
          <OnboardingChecklist
            progress={onboardingFlow.progress}
            onComplete={onboardingFlow.markComplete}
            onDismiss={onboardingFlow.dismiss}
          />
        )}
        
        <SuccessConfetti
          trigger={onboardingFlow.showConfetti}
          onComplete={() => onboardingFlow.setShowConfetti(false)}
        />
      </div>
    </div>
  );
};

export default Create;
