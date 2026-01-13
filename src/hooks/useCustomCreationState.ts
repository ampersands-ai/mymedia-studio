import { useState, useEffect, useCallback } from "react";
import type { CustomCreationState, GenerationOutput } from "@/types/custom-creation";
import type { CreationGroup } from "@/constants/creation-groups";
import { logger } from "@/lib/logger";
import { saveCriticalId, loadCriticalId, clearCriticalId, verifyGeneration } from "@/lib/state-persistence";

const STORAGE_VERSION = '1.1'; // Bumped to invalidate cached invalid UUIDs
const MAX_STORAGE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const POLLING_ID_KEY = 'customCreation_pollingId';
const POLLING_EXPIRY_HOURS = 24;

interface StoredState {
  selectedGroup: CreationGroup;
  selectedModel: string | null;
  prompt: string;
  modelParameters: Record<string, unknown>;
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
      prompt: parsed.prompt || '',
      modelParameters: parsed.modelParameters || {},
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
  notifyOnCompletion: true,
  resolution: "Native",
  advancedOpen: false,
  audioDuration: null,
  videoDuration: null,
  
  // Generation state
  generatedOutput: null,
  generatedOutputs: [],
  selectedOutputIndex: 0,
  pollingGenerationId: null,
  parentGenerationId: null,
  localGenerating: false,
  generationStartTime: null,
  apiCallStartTime: null,
  generationCompleteTime: null,
  isBackgroundProcessing: false,
  
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

  // Recover polling generation on mount
  useEffect(() => {
    const recoverPollingGeneration = async () => {
      const savedPollingId = loadCriticalId(POLLING_ID_KEY, POLLING_EXPIRY_HOURS);
      if (!savedPollingId) return;
      
      try {
        const genState = await verifyGeneration(savedPollingId);
        
        if (genState.exists) {
          if (genState.status === 'PENDING' || genState.status === 'PROCESSING') {
            // Resume polling
            setState(prev => ({
              ...prev,
              pollingGenerationId: savedPollingId,
              localGenerating: true,
              generationStartTime: Date.now(),
            }));
          } else if (genState.status === 'COMPLETED' && genState.storagePath) {
            // Generation completed while away - set output with proper structure
            const output: GenerationOutput = {
              id: savedPollingId,
              storage_path: genState.storagePath,
              output_index: 0,
            };
            setState(prev => ({
              ...prev,
              generatedOutput: genState.outputUrl || null,
              generatedOutputs: [output],
              pollingGenerationId: null,
              localGenerating: false,
            }));
            clearCriticalId(POLLING_ID_KEY);
          } else {
            // Failed or unknown status
            clearCriticalId(POLLING_ID_KEY);
          }
        } else if (genState.verified) {
          // Generation definitely doesn't exist (verified=true), safe to clear
          logger.info('Polling generation not found in database, clearing local state');
          clearCriticalId(POLLING_ID_KEY);
        } else {
          // Couldn't verify (network/auth issue) - preserve polling state to retry later
          logger.warn('Could not verify generation, preserving polling state');
          setState(prev => ({
            ...prev,
            pollingGenerationId: savedPollingId,
            localGenerating: true,
            generationStartTime: Date.now(),
          }));
        }
      } catch (e) {
        logger.error('Failed to recover polling generation', e instanceof Error ? e : new Error(String(e)));
        // Don't clear on exception - preserve state for retry
      }
    };
    
    recoverPollingGeneration();
  }, []);

  // Save polling ID immediately when it changes
  useEffect(() => {
    saveCriticalId(POLLING_ID_KEY, state.pollingGenerationId);
  }, [state.pollingGenerationId]);

  // Persist state to localStorage
  useEffect(() => {
    try {
      const storedState: StoredState = {
        selectedGroup: state.selectedGroup,
        selectedModel: state.selectedModel,
        prompt: state.prompt,
        modelParameters: state.modelParameters,
        timestamp: Date.now(),
        version: STORAGE_VERSION,
      };
      localStorage.setItem('customCreation_state', JSON.stringify(storedState));
    } catch (e) {
      logger.error('Failed to persist state to storage', e instanceof Error ? e : new Error(String(e)));
    }
  }, [state.selectedGroup, state.selectedModel, state.prompt, state.modelParameters]);

  /**
   * Update partial state
   */
  const updateState = useCallback((partial: Partial<CustomCreationState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  /**
   * Reset all state to initial values (full reset including saved state)
   * Preserves the current group and model selection
   */
  const resetState = useCallback(() => {
    // Clear all persisted state
    localStorage.removeItem('customCreation_state');
    localStorage.removeItem(POLLING_ID_KEY);
    clearCriticalId(POLLING_ID_KEY);
    
    // Clear legacy session storage keys
    sessionStorage.removeItem('uploadedImages');
    sessionStorage.removeItem('uploadedAudios');
    sessionStorage.removeItem('uploadedVideos');
    
    // CRITICAL: Clear the "default" and "null" fallback keys explicitly
    // These get used when model becomes null during reset
    sessionStorage.removeItem('uploadedImages_default');
    sessionStorage.removeItem('uploadedImages_null');
    sessionStorage.removeItem('uploadedAudios_default');
    sessionStorage.removeItem('uploadedAudios_null');
    sessionStorage.removeItem('uploadedVideos_default');
    sessionStorage.removeItem('uploadedVideos_null');
    
    // Clear all model-specific upload storage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('uploadedImages_') || key.startsWith('uploadedAudios_') || key.startsWith('uploadedVideos_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    
    // Reset to initial state but preserve current group and model
    setState(prev => ({
      ...INITIAL_STATE,
      selectedGroup: prev.selectedGroup,
      selectedModel: prev.selectedModel,
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
      apiCallStartTime: null,
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
      const hasOutputs = prev.generatedOutputs.length > 0 || prev.generatedOutput;
      
      // Protect recently completed generations (within last 2 seconds)
      const isRecentlyComplete = prev.generationCompleteTime && 
        (Date.now() - prev.generationCompleteTime) < 2000;
      
      // Don't clear outputs if:
      // - Model isn't changing
      // - Generation is in progress
      // - We have existing outputs (just completed)
      // - Generation just completed recently
      if (!isChanging || isGenerating || hasOutputs || isRecentlyComplete) {
        return { ...prev, selectedModel };
      }
      
      return {
        ...prev, 
        selectedModel,
        // Clear outputs and parameters when model changes (schema differs per model)
        generatedOutput: null,
        generatedOutputs: [],
        selectedOutputIndex: 0,
        failedGenerationError: null,
        generateCaption: false,
        modelParameters: {}, // Clear so new schema defaults apply
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
      const hasOutputs = prev.generatedOutputs.length > 0 || prev.generatedOutput;
      
      // Protect recently completed generations (within last 2 seconds)
      const isRecentlyComplete = prev.generationCompleteTime && 
        (Date.now() - prev.generationCompleteTime) < 2000;
      
      // Don't clear outputs if:
      // - Group isn't changing
      // - Generation is in progress
      // - We have existing outputs (just completed)
      // - Generation just completed recently
      if (!isChanging || isGenerating || hasOutputs || isRecentlyComplete) {
        return { ...prev, selectedGroup };
      }
      
      return {
        ...prev, 
        selectedGroup, 
        selectedModel: null,
        // Clear everything when group changes (different content type entirely)
        generatedOutput: null,
        generatedOutputs: [],
        selectedOutputIndex: 0,
        failedGenerationError: null,
        modelParameters: {}, // Clear so new schema defaults apply
        prompt: '', // Clear prompt since switching to different content type
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
