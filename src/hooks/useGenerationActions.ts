import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGeneration } from "./useGeneration";
import { TOAST_IDS, DOWNLOAD_CONFIG } from "@/constants/generation";
import type { GenerationState } from "./useGenerationState";
import type { OnboardingProgress } from "./useOnboarding";

/**
 * Options for generation actions hook
 */
interface UseGenerationActionsOptions {
  generationState: GenerationState;
  updateGenerationState: (partial: Partial<GenerationState>) => void;
  startPolling: (id: string) => void;
  onboardingProgress?: OnboardingProgress | null;
  updateOnboardingProgress?: (updates: Partial<OnboardingProgress['checklist']>) => void;
  setFirstGeneration?: (id: string) => void;
  setShowConfetti?: (show: boolean) => void;
}

/**
 * Hook to handle all generation-related actions
 * @param options - Action configuration and state management
 * @returns Action handlers
 */
export const useGenerationActions = (options: UseGenerationActionsOptions) => {
  const navigate = useNavigate();
  const { generate, isGenerating } = useGeneration();

  /**
   * Handle generation request
   */
  const handleGenerate = useCallback(async () => {
    const { generationState, updateGenerationState, startPolling, onboardingProgress, updateOnboardingProgress, setFirstGeneration, setShowConfetti } = options;

    if (!generationState.prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (!generationState.selectedTemplate) {
      toast.error("No template selected");
      return;
    }

    try {
      // Reset generation tracking
      updateGenerationState({
        startTime: Date.now(),
        completeTime: null,
        currentOutput: null,
        outputs: [],
      });
      
      // Build custom parameters from template configuration
      const customParameters: Record<string, any> = {};
      
      if (generationState.selectedTemplate.hidden_field_defaults) {
        Object.assign(customParameters, generationState.selectedTemplate.hidden_field_defaults);
      }
      
      if (generationState.selectedTemplate.preset_parameters) {
        Object.assign(customParameters, generationState.selectedTemplate.preset_parameters);
      }

      const result = await generate({
        template_id: generationState.selectedTemplate.id,
        prompt: generationState.prompt.trim(),
        custom_parameters: Object.keys(customParameters).length > 0 ? customParameters : undefined,
      });
      
      // Start polling
      const genId = result?.id || result?.generation_id;
      if (genId) {
        startPolling(genId);
        updateGenerationState({ pollingId: genId });
      }

      // If immediate result, show it
      if (result?.storage_path) {
        updateGenerationState({
          currentOutput: result.storage_path,
          outputs: [{ id: result.id, storage_path: result.storage_path, output_index: 0 }],
          completeTime: Date.now(),
        });
        toast.success('Generation complete!', { id: TOAST_IDS.GENERATION_PROGRESS });
        
        // Update onboarding progress
        if (onboardingProgress && !onboardingProgress.checklist.completedFirstGeneration && updateOnboardingProgress && setFirstGeneration && setShowConfetti) {
          updateOnboardingProgress({ completedFirstGeneration: true });
          setFirstGeneration(genId);
          setShowConfetti(true);
        }
      }
    } catch (error: any) {
      // Handle SESSION_EXPIRED error
      if (error.message === "SESSION_EXPIRED") {
        toast.error("Session expired", {
          description: "Please log in again. Your work has been saved.",
          duration: 5000
        });
        setTimeout(() => {
          navigate("/auth");
        }, 2000);
        return;
      }
      
      // Reset start time on error
      updateGenerationState({ startTime: null });
    }
  }, [options, navigate, generate]);

  /**
   * Retry/regenerate with same prompt
   */
  const handleRetry = useCallback(() => {
    const { updateGenerationState } = options;
    
    updateGenerationState({
      outputs: [],
      currentOutput: null,
      startTime: null,
      completeTime: null,
      pollingId: null,
    });
    
    handleGenerate();
  }, [options, handleGenerate]);

  /**
   * Download a single file
   */
  const handleDownload = useCallback(async (storagePath: string) => {
    const { onboardingProgress, updateOnboardingProgress } = options;

    try {
      // Create signed URL for download
      const { data, error } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(storagePath, DOWNLOAD_CONFIG.SIGNED_URL_EXPIRY);
      
      if (error || !data?.signedUrl) {
        toast.error('Failed to create download link');
        return;
      }

      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = storagePath.split('.').pop() || 'file';
      a.download = `generation-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started!', { id: TOAST_IDS.DOWNLOAD });
      
      // Update onboarding progress
      if (onboardingProgress && !onboardingProgress.checklist.downloadedResult && updateOnboardingProgress) {
        updateOnboardingProgress({ downloadedResult: true });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  }, [options]);

  /**
   * Download all files (batch)
   */
  const handleDownloadAll = useCallback(async () => {
    const { generationState } = options;
    const totalFiles = generationState.outputs.length;
    
    for (let i = 0; i < totalFiles; i++) {
      try {
        await handleDownload(generationState.outputs[i].storage_path);
        
        // Delay between downloads
        if (i < totalFiles - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, DOWNLOAD_CONFIG.BATCH_DELAY)
          );
        }
      } catch (error) {
        console.error('Batch download error:', error);
      }
    }
    
    toast.success(`Downloaded ${totalFiles} files!`);
  }, [options, handleDownload]);

  return {
    handleGenerate,
    handleRetry,
    handleDownload,
    handleDownloadAll,
    isGenerating,
  };
};
