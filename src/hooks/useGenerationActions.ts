import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGeneration } from "./useGeneration";
import { TOAST_IDS, DOWNLOAD_CONFIG } from "@/constants/generation";
import { logger, generateRequestId } from '@/lib/logger';
import { clientLogger } from "@/lib/logging/client-logger";
import {
  GenerationState,
  OnboardingProgress,
} from "@/types/generation";

const actionsLogger = logger.child({ component: 'useGenerationActions' });

interface UseGenerationActionsOptions {
  generationState: GenerationState;
  updateGenerationState: (partial: Partial<GenerationState>) => void;
  startPolling: (id: string) => void;
  onboardingProgress?: OnboardingProgress | null;
  updateOnboardingProgress?: (progress: Partial<OnboardingProgress['checklist']>) => void;
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
   * Handle generation request with validation and error handling
   */
  const handleGenerate = useCallback(async () => {
    const requestId = generateRequestId();

    const { generationState, updateGenerationState, startPolling, onboardingProgress, updateOnboardingProgress, setFirstGeneration, setShowConfetti } = options;

    // Validate inputs
    if (!generationState.prompt.trim()) {
      actionsLogger.warn("Empty prompt provided", { requestId });
      toast.error("Please enter a prompt");
      return;
    }

    if (!generationState.selectedTemplate) {
      actionsLogger.warn("No template selected", { requestId });
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
      const customParameters: Record<string, unknown> = {};
      
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
        
        // Track activity
        clientLogger.activity({
          activityType: 'generation',
          activityName: 'image_generation_started',
          routeName: 'Create',
          description: `Started generation with ${generationState.selectedTemplate.model_id || 'unknown model'}`,
          metadata: {
            model_id: generationState.selectedTemplate.model_id,
            template_id: generationState.selectedTemplate.id,
            template_name: generationState.selectedTemplate.name,
          },
        });
      }

      // If immediate result, show it
      if (result?.storage_path) {
        updateGenerationState({
          currentOutput: result.storage_path,
          outputs: [{ id: result.id, storage_path: result.storage_path, output_index: 0 }],
          completeTime: Date.now(),
        });
        toast.success('Generation complete!', { id: TOAST_IDS.GENERATION_PROGRESS });
        
        // Update onboarding progress - track clickedGenerate
        if (onboardingProgress && !onboardingProgress.checklist.clickedGenerate && updateOnboardingProgress && setFirstGeneration && setShowConfetti && genId) {
          updateOnboardingProgress({ clickedGenerate: true });
          setFirstGeneration(genId);
          setShowConfetti(true);
        }
      }
    } catch (error) {
      // Handle SESSION_EXPIRED error
      if (error instanceof Error && error.message === "SESSION_EXPIRED") {
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
      
      // Update onboarding progress
      if (onboardingProgress && !onboardingProgress.checklist.downloadedResult && updateOnboardingProgress) {
        updateOnboardingProgress({ downloadedResult: true });
      }
    } catch (error) {
      logger.error('Download failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'useGenerationActions',
        operation: 'handleDownload',
        storagePath
      });
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
        logger.error('Batch download error', error instanceof Error ? error : new Error(String(error)), {
          component: 'useGenerationActions',
          operation: 'handleDownloadAll',
          fileIndex: i,
          totalFiles
        });
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
