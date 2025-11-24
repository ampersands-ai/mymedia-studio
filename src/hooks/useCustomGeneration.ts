import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useGeneration } from "@/hooks/useGeneration";
import { useAuth } from "@/contexts/AuthContext";
import { getMaxPromptLength } from "@/lib/custom-creation-utils";
import { CAPTION_GENERATION_COST } from "@/constants/custom-creation";
import type { CustomCreationState } from "@/types/custom-creation";
import { executeGeneration } from "@/lib/generation/executeGeneration";
import { logger, generateRequestId } from '@/lib/logger';
import { handleError } from "@/lib/errors";
import { FilteredModel, UserTokens, OnboardingProgress } from "@/types/generation";

const customGenerationLogger = logger.child({ component: 'useCustomGeneration' });

interface UseCustomGenerationOptions {
  state: CustomCreationState;
  updateState: (partial: Partial<CustomCreationState>) => void;
  startPolling: (id: string) => void;
  uploadedImages: File[];
  uploadImagesToStorage: (userId: string) => Promise<string[]>;
  imageFieldInfo: { fieldName: string | null; isRequired: boolean; isArray: boolean; maxImages: number };
  filteredModels: FilteredModel[];
  onboardingProgress: OnboardingProgress | null;
  updateProgress: (progress: Partial<OnboardingProgress['checklist']>) => void;
  setFirstGeneration: (id: string) => void;
  userTokens: UserTokens | null;
}

/**
 * All generation-related actions
 * Handles generation, token calculation, image upload, caption triggering
 */
export const useCustomGeneration = (options: UseCustomGenerationOptions) => {
  const {
    state,
    updateState,
    startPolling,
    uploadedImages,
    uploadImagesToStorage,
    filteredModels,
    onboardingProgress,
    updateProgress,
    setFirstGeneration,
    userTokens,
  } = options;

  const { user } = useAuth();
  const navigate = useNavigate();
  const { generate, isGenerating } = useGeneration();

  /**
   * Calculate token cost with multipliers
   */
  const calculateTokens = useCallback(() => {
    if (!state.selectedModel || !filteredModels) return 50;

    const currentModel = filteredModels.find(m => m.record_id === state.selectedModel);
    if (!currentModel) return 50;

    let tokens = currentModel.base_token_cost;
    const multipliers = currentModel.cost_multipliers || {};
    
    for (const [paramName, multiplierConfig] of Object.entries(multipliers)) {
      const paramValue = state.modelParameters[paramName];
      
      if (paramValue === undefined || paramValue === null) continue;
      
      // Handle nested object (parameter-first structure)
      // Example: { "quality": { "Standard": 1, "HD": 1.5 } }
      if (typeof multiplierConfig === 'object' && !Array.isArray(multiplierConfig)) {
        const multiplier = (multiplierConfig as Record<string, number>)[paramValue] ?? 1;
        if (typeof multiplier === 'number') {
          tokens *= multiplier;
        }
      }
      // Legacy: Handle flat number (for backward compatibility)
      else if (typeof multiplierConfig === 'number') {
        if (typeof paramValue === 'boolean' && paramValue === true) {
          tokens *= multiplierConfig;
        }
        else if (Array.isArray(paramValue)) {
          tokens += (multiplierConfig * paramValue.length);
        }
        else if (typeof paramValue === 'number') {
          tokens += (multiplierConfig * paramValue);
        }
      }
    }
    
    // Legacy: Add cost for uploaded images if multiplier exists
    if (uploadedImages.length > 0 && multipliers.uploaded_image) {
      tokens += uploadedImages.length * (multipliers.uploaded_image as number);
    }
    
    return Math.round(tokens * 100) / 100;
  }, [state.selectedModel, state.modelParameters, uploadedImages, filteredModels]);

  /**
   * Estimated tokens with caption cost
   */
  const estimatedTokens = useMemo(() => {
    let baseTokens = calculateTokens();
    if (state.generateCaption) {
      baseTokens += CAPTION_GENERATION_COST;
    }
    return baseTokens;
  }, [calculateTokens, state.generateCaption]);

  /**
   * Handle generation - now uses shared executeGeneration pipeline
   */
  const handleGenerate = useCallback(async () => {
    const requestId = generateRequestId();
    const currentModel = filteredModels.find(m => m.record_id === state.selectedModel);
    
    if (!currentModel) {
      toast.error("Please select a model");
      return;
    }

    // Credit balance check
    const creditBalance = userTokens?.tokens_remaining || 0;
    if (creditBalance && estimatedTokens > creditBalance) {
      toast.error("Insufficient credits", {
        description: `This creation requires ${estimatedTokens} credits, but you only have ${creditBalance}. Upgrade to continue.`,
        duration: 10000,
        action: {
          label: "View Plans",
          onClick: () => navigate("/pricing")
        }
      });
      return;
    }

    if (!user?.id) {
      toast.error("Please sign in to create content");
      return;
    }

    // Get max prompt length for current model/config
    const maxPromptLength = getMaxPromptLength(currentModel, state.modelParameters.customMode);

    // Start generation
    updateState({ 
      localGenerating: true, 
      generationStartTime: Date.now(),
      generatedOutput: null,
      generatedOutputs: [],
      selectedOutputIndex: 0,
      captionData: null,
      showLightbox: false,
    });

    try {
      // Use shared generation pipeline
      // TypeScript note: currentModel is guaranteed to be defined after null check above
      const genId = await executeGeneration({
        model: currentModel as { record_id: string; [key: string]: unknown },
        prompt: state.prompt,
        modelParameters: state.modelParameters,
        uploadedImages,
        userId: user.id,
        uploadImagesToStorage,
        generate,
        startPolling,
        navigate,
        maxPromptLength,
      });

      updateState({ pollingGenerationId: genId });

      // Update onboarding
      if (onboardingProgress && !onboardingProgress.checklist.completedFirstGeneration) {
        updateProgress({ completedFirstGeneration: true });
        setFirstGeneration(genId);
      }
    } catch (error) {
      const appError = handleError(error);
      
      // Enhanced user-friendly error messages
      if (appError.message.includes('API key not configured') || appError.message.includes('not configured')) {
        toast.error('Model temporarily unavailable. Please contact support.');
      } else if (appError.message.includes('Unauthorized') || appError.message.includes('Session expired')) {
        toast.error('Session expired. Please log in again.');
      } else if (appError.message.includes('Model not found')) {
        toast.error('This model is no longer available.');
      } else if (appError.message.includes('Failed to send a request') || appError.message.includes('Connection')) {
        toast.error('Connection error. Please check your internet and try again.');
      } else if (appError.message.includes('Insufficient tokens') || appError.message.includes('credits')) {
        toast.error('Insufficient credits. Please add more credits to continue.');
      } else {
        toast.error(appError.message || 'Generation failed. Please try again.');
      }
      
      customGenerationLogger.error('Custom generation failed', appError);
      
      updateState({ generationStartTime: null });
    } finally {
      updateState({ localGenerating: false });
    }
  }, [
    state, 
    estimatedTokens, 
    userTokens, 
    filteredModels, 
    uploadedImages,
    generate,
    startPolling,
    uploadImagesToStorage,
    updateState,
    navigate,
    user,
    onboardingProgress,
    updateProgress,
    setFirstGeneration,
  ]);

  /**
   * Handle surprise me prompt generation
   */
  const handleSurpriseMe = useCallback((getSurpriseMePrompt: (group: string) => string) => {
    updateState({ generatingSurprise: true });
    
    try {
      const selectedPrompt = getSurpriseMePrompt(state.selectedGroup);
      updateState({ prompt: selectedPrompt, generatingSurprise: false });
      
      const promptTypeLabels = {
        'image_editing': 'Image editing',
        'prompt_to_image': 'Text to image',
        'prompt_to_video': 'Text to video',
        'image_to_video': 'Image animation',
        'prompt_to_audio': 'Audio studio'
      };
      
      toast.success(`${promptTypeLabels[state.selectedGroup]} prompt loaded!`);
    } catch (error) {
      const handledError = handleError(error, {
        component: 'useCustomGeneration',
        operation: 'handleSurpriseMe',
        group: state.selectedGroup
      });
      
      customGenerationLogger.error('Surprise me generation failed', handledError);
      toast.error("Failed to load prompt. Please try again.");
      updateState({ generatingSurprise: false });
    }
  }, [state.selectedGroup, updateState]);

  /**
   * Cancel ongoing generation - works for pending or processing
   */
  const handleCancelGeneration = useCallback(async (generationId: string | null) => {
    if (!generationId) return;
    
    // Optimistic UI update
    updateState({ 
      pollingGenerationId: null, 
      localGenerating: false 
    });
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('generations')
        .update({ status: 'cancelled' })
        .eq('id', generationId)
        .in('status', ['pending', 'processing']); // Cancel if pending or processing
      
      if (error) {
        logger.error('Failed to cancel generation', error, {
          component: 'useCustomGeneration',
          operation: 'handleCancelGeneration',
          generationId
        });
      } else {
        logger.debug('Generation cancelled', {
          component: 'useCustomGeneration',
          operation: 'handleCancelGeneration',
          generationId
        });
      }
    } catch (error) {
      logger.error('Error cancelling generation', error, {
        component: 'useCustomGeneration',
        operation: 'handleCancelGeneration',
        generationId
      });
    }
  }, [updateState]);

  return {
    handleGenerate,
    handleSurpriseMe,
    handleCancelGeneration,
    calculateTokens,
    estimatedTokens,
    isGenerating,
  };
};
