import { useState, useEffect, useCallback } from "react";
import type { CustomCreationState } from "@/types/custom-creation";
import type { CreationGroup } from "@/constants/creation-groups";

const INITIAL_STATE: CustomCreationState = {
  // Form state
  prompt: "",
  selectedModel: null,
  selectedGroup: "prompt_to_image",
  modelParameters: {},
  enhancePrompt: false,
  generateCaption: false,
  resolution: "Native",
  advancedOpen: false,
  
  // Generation state
  generatedOutput: null,
  generatedOutputs: [],
  selectedOutputIndex: 0,
  pollingGenerationId: null,
  parentGenerationId: null,
  localGenerating: false,
  generationStartTime: null,
  generationCompleteTime: null,
  
  // UI state
  showLightbox: false,
  captionExpanded: false,
  hashtagsExpanded: false,
  showResetDialog: false,
  generatingSurprise: false,
  generatingVideoIndex: null,
  
  // Caption state
  captionData: null,
  isGeneratingCaption: false,
  
  // Template preview
  templateBeforeImage: null,
  templateAfterImage: null,
};

/**
 * Consolidated state management for custom creation
 * Manages 25+ state variables in a single object
 */
export const useCustomCreationState = () => {
  const [state, setState] = useState<CustomCreationState>(() => ({
    ...INITIAL_STATE,
    selectedGroup: (localStorage.getItem('customCreation_selectedGroup') as CreationGroup) || "prompt_to_image",
    selectedModel: localStorage.getItem('customCreation_selectedModel') || null,
  }));

  // Persist selectedGroup and selectedModel to localStorage
  useEffect(() => {
    localStorage.setItem('customCreation_selectedGroup', state.selectedGroup);
  }, [state.selectedGroup]);

  useEffect(() => {
    if (state.selectedModel) {
      localStorage.setItem('customCreation_selectedModel', state.selectedModel);
    }
  }, [state.selectedModel]);

  /**
   * Update partial state
   */
  const updateState = useCallback((partial: Partial<CustomCreationState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  /**
   * Reset all state to initial values
   */
  const resetState = useCallback(() => {
    setState(prev => ({
      ...INITIAL_STATE,
      selectedGroup: prev.selectedGroup, // Keep selected group
    }));
  }, []);

  /**
   * Reset generation-related fields only
   */
  const resetGenerationState = useCallback(() => {
    setState(prev => ({
      ...prev,
      generatedOutput: null,
      generatedOutputs: [],
      selectedOutputIndex: 0,
      pollingGenerationId: null,
      generationStartTime: null,
      generationCompleteTime: null,
      localGenerating: false,
      captionData: null,
      showLightbox: false,
    }));
  }, []);

  /**
   * Convenience setter: Update prompt
   */
  const setPrompt = useCallback((prompt: string) => {
    setState(prev => ({ ...prev, prompt }));
  }, []);

  /**
   * Convenience setter: Update selected model
   */
  const setSelectedModel = useCallback((selectedModel: string | null) => {
    setState(prev => ({ 
      ...prev, 
      selectedModel,
      // Clear outputs when model changes
      generatedOutput: null,
      generatedOutputs: [],
      selectedOutputIndex: 0,
    }));
  }, []);

  /**
   * Convenience setter: Update selected group
   */
  const setSelectedGroup = useCallback((selectedGroup: CreationGroup) => {
    setState(prev => ({ 
      ...prev, 
      selectedGroup, 
      selectedModel: null,
      // Clear outputs when group changes
      generatedOutput: null,
      generatedOutputs: [],
      selectedOutputIndex: 0,
    }));
  }, []);

  return {
    state,
    updateState,
    resetState,
    resetGenerationState,
    setPrompt,
    setSelectedModel,
    setSelectedGroup,
  };
};
