/**
 * Storyboard Local State Hook
 * Manages UI state that doesn't belong in the main useStoryboard hook
 */

import { useState, useCallback } from 'react';
import type { StoryboardLocalState, Storyboard } from '@/types/storyboard';

/**
 * Hook to manage local UI state for storyboard editor
 * Consolidates 8 separate useState calls into a single state object
 * 
 * @param storyboard - Current storyboard object (used for initial state)
 * @returns State object and update functions
 */
export const useStoryboardLocalState = (storyboard: Storyboard | null) => {
  const [state, setState] = useState<StoryboardLocalState>({
    showScenes: storyboard?.status !== 'complete',
    showSubtitleCustomizer: false,
    showRerenderDialog: false,
    renderStatusMessage: '',
    introVoiceOverText: storyboard?.intro_voiceover_text || '',
    introImagePrompt: storyboard?.intro_image_prompt || '',
    rerenderCost: 0,
    existingVideoUrl: '',
  });

  /**
   * Update partial state
   */
  const updateState = useCallback((partial: Partial<StoryboardLocalState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  /**
   * Individual setters for convenience
   */
  const setShowScenes = useCallback((showScenes: boolean) => {
    setState(prev => ({ ...prev, showScenes }));
  }, []);

  const setShowSubtitleCustomizer = useCallback((showSubtitleCustomizer: boolean) => {
    setState(prev => ({ ...prev, showSubtitleCustomizer }));
  }, []);

  const setShowRerenderDialog = useCallback((showRerenderDialog: boolean) => {
    setState(prev => ({ ...prev, showRerenderDialog }));
  }, []);

  return {
    state,
    updateState,
    setShowScenes,
    setShowSubtitleCustomizer,
    setShowRerenderDialog,
  };
};
