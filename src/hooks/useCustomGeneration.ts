import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useGeneration } from "@/hooks/useGeneration";
import { useAuth } from "@/contexts/AuthContext";
import { 
  buildCustomParameters, 
  validateGenerationInputs, 
  handleGenerationError 
} from "@/lib/custom-creation-utils";
import { CAPTION_GENERATION_COST } from "@/constants/custom-creation";
import { trackEvent } from "@/lib/posthog";
import type { CustomCreationState } from "@/types/custom-creation";

interface UseCustomGenerationOptions {
  state: CustomCreationState;
  updateState: (partial: Partial<CustomCreationState>) => void;
  startPolling: (id: string) => void;
  uploadImagesToStorage: (userId: string) => Promise<string[]>;
  imageFieldInfo: { fieldName: string | null; isRequired: boolean; isArray: boolean; maxImages: number };
  filteredModels: any[];
  onboardingProgress: any;
  updateProgress: (progress: any) => void;
  setFirstGeneration: (id: string) => void;
  userTokens: any;
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
    uploadImagesToStorage,
    imageFieldInfo,
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
        const multiplier = (multiplierConfig as Record<string, any>)[paramValue] ?? 1;
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
    if (state.uploadedImages.length > 0 && multipliers.uploaded_image) {
      tokens += state.uploadedImages.length * (multipliers.uploaded_image as number);
    }
    
    return Math.round(tokens * 100) / 100;
  }, [state.selectedModel, state.modelParameters, state.uploadedImages, filteredModels]);

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
   * Handle generation
   */
  const handleGenerate = useCallback(async () => {
    const currentModel = filteredModels.find(m => m.record_id === state.selectedModel);
    
    if (!currentModel) {
      toast.error("Please select a model");
      return;
    }

    // Get max prompt length for current model/config
    const isKieAiAudio = currentModel.provider === 'kie_ai' && currentModel.content_type === 'audio';
    const customMode = state.modelParameters.customMode;
    const maxPromptLength = (isKieAiAudio && customMode === false) ? 500 : 5000;

    // Validation
    const validation = validateGenerationInputs(
      currentModel,
      state.prompt,
      state.uploadedImages,
      currentModel.input_schema?.required?.includes('prompt') || false,
      imageFieldInfo.isRequired,
      maxPromptLength
    );
    
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Validate required fields from schema (advanced options)
    if (currentModel.input_schema) {
      const requiredFields = currentModel.input_schema.required || [];
      const schemaProperties = currentModel.input_schema.properties || {};
      const excludeFields = ['prompt', 'inputImage', 'image_urls', 'imageUrl', 'image_url', 'image', 'images', 'filesUrl', 'fileUrls', 'reference_image_urls', 'frameImages'];

      for (const field of requiredFields) {
        if (excludeFields.includes(field)) continue;
        
        const value = state.modelParameters[field];
        if (value === undefined || value === null || value === '') {
          const fieldTitle = schemaProperties[field]?.title || field;
          toast.error(`Please provide a value for: ${fieldTitle}`);
          return;
        }
      }
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
      // Build custom parameters with conditional filtering
      const customParameters = buildCustomParameters(state.modelParameters, currentModel.input_schema);

      // Upload images if required
      if (imageFieldInfo.fieldName && state.uploadedImages.length > 0) {
        const imageUrls = await uploadImagesToStorage(user.id);
        if (imageFieldInfo.isArray) {
          customParameters[imageFieldInfo.fieldName] = imageUrls;
        } else {
          customParameters[imageFieldInfo.fieldName] = imageUrls[0];
        }
      }

      // Generate
      const result = await generate({
        model_record_id: state.selectedModel,
        prompt: state.prompt.trim(),
        custom_parameters: customParameters,
        enhance_prompt: state.enhancePrompt,
      });

      // Start polling
      const genId = result?.id || result?.generation_id;
      if (genId) {
        startPolling(genId);
        updateState({ pollingGenerationId: genId });
      }

      // Update onboarding
      if (onboardingProgress && !onboardingProgress.checklist.completedFirstGeneration) {
        updateProgress({ completedFirstGeneration: true });
        setFirstGeneration(genId);
      }

    } catch (error: any) {
      const handled = handleGenerationError(error, navigate);
      if (!handled) {
        console.error('Generation error:', error);
      }
      updateState({ generationStartTime: null });
    } finally {
      updateState({ localGenerating: false });
    }
  }, [
    state, 
    estimatedTokens, 
    userTokens, 
    filteredModels, 
    imageFieldInfo,
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
        'prompt_to_image': 'Image generation',
        'prompt_to_video': 'Video generation',
        'image_to_video': 'Image animation',
        'prompt_to_audio': 'Audio generation'
      };
      
      toast.success(`${promptTypeLabels[state.selectedGroup]} prompt loaded!`);
    } catch (error) {
      console.error('Surprise me error:', error);
      toast.error("Failed to load prompt. Please try again.");
      updateState({ generatingSurprise: false });
    }
  }, [state.selectedGroup, updateState]);

  return {
    handleGenerate,
    handleSurpriseMe,
    calculateTokens,
    estimatedTokens,
    isGenerating,
  };
};
