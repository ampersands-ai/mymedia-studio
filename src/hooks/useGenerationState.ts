import { useState, useCallback } from "react";
import type { TemplatePreview } from "@/types/templates";

/**
 * Single generation output structure
 */
export interface GenerationOutput {
  id: string;
  storage_path: string;
  output_index: number;
  provider_task_id?: string;
  model_id?: string;
  provider?: string;
  type?: string;
}

/**
 * Consolidated generation state
 */
export interface GenerationState {
  outputs: GenerationOutput[];      // All generated outputs (batch)
  currentOutput: string | null;     // Primary output storage_path
  startTime: number | null;         // Generation start timestamp
  completeTime: number | null;      // Generation complete timestamp
  pollingId: string | null;         // Currently polling generation ID
  selectedTemplate: TemplatePreview | null;
  prompt: string;
}

const initialState: GenerationState = {
  outputs: [],
  currentOutput: null,
  startTime: null,
  completeTime: null,
  pollingId: null,
  selectedTemplate: null,
  prompt: "",
};

/**
 * Hook to manage consolidated generation state
 * @returns State and state update functions
 */
export const useGenerationState = () => {
  const [state, setState] = useState<GenerationState>(initialState);

  /**
   * Update partial state
   */
  const updateState = useCallback((partial: Partial<GenerationState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  /**
   * Reset generation-related fields (outputs, times, polling)
   */
  const resetGenerationState = useCallback(() => {
    setState(prev => ({
      ...prev,
      outputs: [],
      currentOutput: null,
      startTime: null,
      completeTime: null,
      pollingId: null,
    }));
  }, []);

  /**
   * Set selected template and optional prompt
   */
  const setTemplate = useCallback((template: TemplatePreview | null, examplePrompt?: string) => {
    setState(prev => ({
      ...prev,
      selectedTemplate: template,
      prompt: examplePrompt || prev.prompt,
    }));
  }, []);

  /**
   * Set prompt value
   */
  const setPrompt = useCallback((prompt: string) => {
    setState(prev => ({ ...prev, prompt }));
  }, []);

  return {
    state,
    updateState,
    resetGenerationState,
    setTemplate,
    setPrompt,
  };
};
