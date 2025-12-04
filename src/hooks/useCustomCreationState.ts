import { useState, useEffect, useCallback } from "react";
import type { CustomCreationState } from "@/types/custom-creation";
import type { CreationGroup } from "@/constants/creation-groups";
import { logger } from "@/lib/logger";

const STORAGE_VERSION = '1.0';
const MAX_STORAGE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StoredState {
  selectedGroup: CreationGroup;
  selectedModel: string | null;
  timestamp: number;
  version: string;
}

/**
 * Load validated state from localStorage
 */
function loadFromStorage(): Partial<CustomCreationState> {
  try {
    const stored = localStorage.getItem('customCreation_state');
    if (!stored) return {};
    
    const parsed: StoredState = JSON.parse(stored);
    
    // Validate version
    if (parsed.version !== STORAGE_VERSION) {
      logger.info('Storage version mismatch, clearing state', {
        stored: parsed.version,
        current: STORAGE_VERSION
      });
      localStorage.removeItem('customCreation_state');
      return {};
    }
    
    // Check expiration
    if (Date.now() - parsed.timestamp > MAX_STORAGE_AGE) {
      logger.info('Storage expired, clearing state');
      localStorage.removeItem('customCreation_state');
      return {};
    }
    
    return {
      selectedGroup: parsed.selectedGroup,
      selectedModel: parsed.selectedModel,
    };
  } catch (e) {
    logger.error('Failed to load state from storage', e instanceof Error ? e : new Error(String(e)));
    localStorage.removeItem('customCreation_state');
    return {};
  }
}

/**
 * Clean stale generation states on mount
 */
function cleanStaleGenerationStates() {
  const keysToCheck = [
    'pending_generation',
    'currentStoryboardId',
    'customCreation_pollingId'
  ];
  
  let cleaned = 0;
  keysToCheck.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const data = JSON.parse(value);
        // If older than 24 hours, remove
        if (data.timestamp && Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    } catch {
      localStorage.removeItem(key);
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    logger.info(`Cleaned ${cleaned} stale generation states`);
  }
}

const INITIAL_STATE: CustomCreationState = {
  // Form state
  prompt: "",
  selectedModel: null,
  selectedGroup: "prompt_to_image",
  modelParameters: {},
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
  
  // Failed generation error
  failedGenerationError: null,
};

/**
 * Consolidated state management for custom creation
 * Manages 25+ state variables in a single object
 */
export const useCustomCreationState = () => {
  // Clean stale generation states on mount
  useEffect(() => {
    cleanStaleGenerationStates();
  }, []);

  const [state, setState] = useState<CustomCreationState>(() => {
    const loadedState = loadFromStorage();
    return {
      ...INITIAL_STATE,
      ...loadedState,
    };
  });

  // Persist selectedGroup and selectedModel to localStorage with validation
  useEffect(() => {
    try {
      const storedState: StoredState = {
        selectedGroup: state.selectedGroup,
        selectedModel: state.selectedModel,
        timestamp: Date.now(),
        version: STORAGE_VERSION,
      };
      localStorage.setItem('customCreation_state', JSON.stringify(storedState));
    } catch (e) {
      logger.error('Failed to persist state to storage', e instanceof Error ? e : new Error(String(e)));
    }
  }, [state.selectedGroup, state.selectedModel]);

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
      selectedModel: prev.selectedModel, // Keep selected model
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
   * Convenience setter: Update prompt (resets generateCaption)
   */
  const setPrompt = useCallback((prompt: string) => {
    setState(prev => ({ ...prev, prompt, generateCaption: false }));
  }, []);

  /**
   * Convenience setter: Update selected model
   */
  const setSelectedModel = useCallback((selectedModel: string | null) => {
    setState(prev => {
      // Only clear outputs if model is actually changing and not during active generation
      const isChanging = selectedModel !== prev.selectedModel;
      const isGenerating = prev.localGenerating || prev.pollingGenerationId;
      
      if (!isChanging || isGenerating) {
        return { ...prev, selectedModel };
      }
      
      return {
        ...prev, 
        selectedModel,
        // Clear outputs only when model changes and not generating
        generatedOutput: null,
        generatedOutputs: [],
        selectedOutputIndex: 0,
        failedGenerationError: null,
        generateCaption: false,
      };
    });
  }, []);

  /**
   * Convenience setter: Update selected group
   */
  const setSelectedGroup = useCallback((selectedGroup: CreationGroup) => {
    setState(prev => {
      // Only clear outputs if group is actually changing and not during active generation
      const isChanging = selectedGroup !== prev.selectedGroup;
      const isGenerating = prev.localGenerating || prev.pollingGenerationId;
      
      if (!isChanging || isGenerating) {
        return { ...prev, selectedGroup };
      }
      
      return {
        ...prev, 
        selectedGroup, 
        selectedModel: null,
        // Clear outputs only when group changes and not generating
        generatedOutput: null,
        generatedOutputs: [],
        selectedOutputIndex: 0,
        failedGenerationError: null,
      };
    });
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
