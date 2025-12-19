import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useGeneration } from "@/hooks/useGeneration";
import { useAuth } from "@/contexts/AuthContext";
import { usePromptModeration } from "@/hooks/usePromptModeration";
import { getMaxPromptLength } from "@/lib/custom-creation-utils";
import { CAPTION_GENERATION_COST } from "@/constants/custom-creation";
import type { CustomCreationState } from "@/types/custom-creation";
import { executeGeneration } from "@/lib/generation/executeGeneration";
import { logger } from '@/lib/logger';
import { handleError } from "@/lib/errors";
import { UserTokens, OnboardingProgress } from "@/types/generation";
import type { AIModel } from "@/hooks/useModels";
import { getModel } from "@/lib/models/registry";

const customGenerationLogger = logger.child({ component: 'useCustomGeneration' });

interface UseCustomGenerationOptions {
  state: CustomCreationState;
  updateState: (partial: Partial<CustomCreationState>) => void;
  startPolling: (id: string) => void;
  uploadedImages: File[];
  uploadImagesToStorage: (userId: string) => Promise<string[]>;
  imageFieldInfo: { fieldName: string | null; isRequired: boolean; isArray: boolean; maxImages: number };
  // Audio upload support
  uploadedAudios?: File[];
  uploadAudiosToStorage?: (userId: string) => Promise<string[]>;
  getAudioDuration?: (file: File) => Promise<number>;
  audioFieldInfo?: { fieldName: string | null; isRequired: boolean; maxDuration: number | null };
  filteredModels: AIModel[];
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
    uploadedAudios,
    uploadAudiosToStorage,
    getAudioDuration,
    filteredModels,
    onboardingProgress,
    updateProgress,
    setFirstGeneration,
    userTokens,
  } = options;

  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { generate, isGenerating } = useGeneration();
  const { checkPrompt, isChecking: isModerating } = usePromptModeration();

  /**
   * Calculate token cost using model's calculateCost() function
   * This ensures single source of truth - model files control all pricing
   */
  const calculateTokens = useCallback(() => {
    if (!state.selectedModel || !filteredModels) return 50;

    const currentModel = filteredModels.find(m => m.record_id === state.selectedModel);
    if (!currentModel) return 50;

    // PRIMARY: Use model's own calculateCost function (single source of truth)
    try {
      const modelModule = getModel(state.selectedModel);
      if (modelModule?.calculateCost) {
        const inputs = { 
          prompt: state.prompt, 
          ...state.modelParameters 
        };
        // Pass audio duration for lip sync models (cost depends on audio length)
        const audioDurationSeconds = state.audioDuration ?? undefined;
        return Math.round(modelModule.calculateCost(inputs, audioDurationSeconds) * 100) / 100;
      }
    } catch {
      // Model not found in registry - fall through to fallback
    }

    // FALLBACK: Legacy multiplier-based calculation (from database)
    let tokens = currentModel.base_token_cost;
    const multipliers = currentModel.cost_multipliers || {};
    
    for (const [paramName, multiplierConfig] of Object.entries(multipliers)) {
      const paramValue = state.modelParameters[paramName];
      
      if (paramValue === undefined || paramValue === null) continue;
      
      if (typeof multiplierConfig === 'object' && !Array.isArray(multiplierConfig)) {
        const multiplier = (multiplierConfig as Record<string, number>)[paramValue] ?? 1;
        if (typeof multiplier === 'number') {
          tokens *= multiplier;
        }
      }
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
    
    if (uploadedImages.length > 0 && multipliers.uploaded_image) {
      tokens += uploadedImages.length * (multipliers.uploaded_image as number);
    }
    
    return Math.round(tokens * 100) / 100;
  }, [state.selectedModel, state.modelParameters, state.prompt, state.audioDuration, uploadedImages, filteredModels]);

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
    const currentModel = filteredModels.find(m => m.record_id === state.selectedModel);
    
    if (!currentModel) {
      toast.error("Please select a model");
      return;
    }

    // Credit balance check (synchronous - no delay)
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

    // INSTANT feedback - set generating state immediately before any async operations
    updateState({ 
      localGenerating: true, 
      generationStartTime: Date.now(),
      generatedOutput: null,
      generatedOutputs: [],
      selectedOutputIndex: 0,
      captionData: null,
      showLightbox: false,
      failedGenerationError: null,
    });

    try {
      // Prompt moderation check (async but now runs AFTER UI shows "generating")
      if (state.prompt?.trim()) {
        const moderationResult = await checkPrompt(state.prompt);
        if (moderationResult?.flagged && !moderationResult.exempt) {
          const flaggedCategories = moderationResult.flaggedCategories?.join(', ') || 'content policy';
          toast.error("Content policy violation", {
            description: `Your prompt contains content that violates our guidelines: ${flaggedCategories}. Please revise and try again.`,
            duration: 8000,
          });
          updateState({ localGenerating: false, generationStartTime: null });
          return;
        }
      }

      // Get max prompt length for current model/config
      if (!currentModel.provider || !currentModel.content_type) {
        throw new Error('Model missing required provider or content_type');
      }
      const modelSchema = {
        provider: currentModel.provider,
        content_type: currentModel.content_type,
        input_schema: currentModel.input_schema,
        max_images: currentModel.max_images ?? undefined,
      };
      const maxPromptLength = getMaxPromptLength(modelSchema as Parameters<typeof getMaxPromptLength>[0], state.modelParameters.customMode);

      // Use shared generation pipeline
      const genId = await executeGeneration({
        model: {
          record_id: currentModel.record_id,
        },
        prompt: state.prompt,
        modelParameters: state.modelParameters,
        uploadedImages,
        uploadedAudios,
        userId: user.id,
        uploadImagesToStorage,
        uploadAudiosToStorage,
        getAudioDuration,
        generate,
        startPolling,
        navigate,
        maxPromptLength,
      });

      updateState({ pollingGenerationId: genId });

      // Invalidate credit balance to ensure UI updates after deduction
      queryClient.invalidateQueries({ queryKey: ['user-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });

      // Update onboarding - track clickedGenerate
      if (onboardingProgress && !onboardingProgress.checklist.clickedGenerate) {
        updateProgress({ clickedGenerate: true });
        setFirstGeneration(genId);
      }
    } catch (error) {
      const appError = handleError(error);
      
      // Enhanced user-friendly error messages
      if (appError.message.includes('EMAIL_NOT_VERIFIED') || appError.message.includes('Email verification required')) {
        toast.error('Please verify your email', {
          description: 'Check your inbox for the verification email before generating content.',
          duration: 8000,
        });
      } else if (appError.message.includes('API key not configured') || appError.message.includes('not configured')) {
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
    checkPrompt,
  ]);

  /**
   * Handle surprise me prompt generation
   */
  const handleSurpriseMe = useCallback((getSurpriseMePrompt: (group: string) => string) => {
    updateState({ generatingSurprise: true });
    
    try {
      const selectedPrompt = getSurpriseMePrompt(state.selectedGroup);
      updateState({ prompt: selectedPrompt, generatingSurprise: false });
      
      const promptTypeLabels: Record<string, string> = {
        'image_editing': 'Image editing',
        'prompt_to_image': 'Text to image',
        'prompt_to_video': 'Text to video',
        'image_to_video': 'Image animation',
        'video_to_video': 'Video to video',
        'lip_sync': 'Lip sync',
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
      logger.error('Error cancelling generation', error instanceof Error ? error : new Error(String(error)), {
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
    isModerating,
  };
};
