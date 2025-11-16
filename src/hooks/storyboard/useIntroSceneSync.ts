/**
 * Intro Scene Sync Hook
 * Manages debounced syncing of intro scene fields with storyboard
 */

import { useState, useEffect } from 'react';
import type { Storyboard } from '@/types/storyboard';

interface UseIntroSceneSyncOptions {
  storyboard: Storyboard | null;
  updateIntroScene: (field: string, value: string) => void;
}

/**
 * Hook to manage intro scene text fields with debounced saving
 * Syncs local state with storyboard and auto-saves changes after 1s delay
 * 
 * @param options - Storyboard and update function
 * @returns Local state and setters for intro fields
 */
export const useIntroSceneSync = ({
  storyboard,
  updateIntroScene,
}: UseIntroSceneSyncOptions) => {
  const [introVoiceOverText, setIntroVoiceOverText] = useState(
    storyboard?.intro_voiceover_text || ''
  );
  const [introImagePrompt, setIntroImagePrompt] = useState(
    storyboard?.intro_image_prompt || ''
  );

  // Sync with storyboard when it changes
  useEffect(() => {
    if (storyboard) {
      setIntroVoiceOverText(storyboard.intro_voiceover_text || '');
      setIntroImagePrompt(storyboard.intro_image_prompt || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyboard?.intro_voiceover_text, storyboard?.intro_image_prompt]);

  // Debounced save for voiceover text (1s)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (storyboard && introVoiceOverText !== storyboard.intro_voiceover_text) {
        updateIntroScene('intro_voiceover_text', introVoiceOverText);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introVoiceOverText, storyboard?.intro_voiceover_text, updateIntroScene]);

  // Debounced save for image prompt (1s)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (storyboard && introImagePrompt !== storyboard.intro_image_prompt) {
        updateIntroScene('intro_image_prompt', introImagePrompt);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introImagePrompt, storyboard?.intro_image_prompt, updateIntroScene]);

  return {
    introVoiceOverText,
    setIntroVoiceOverText,
    introImagePrompt,
    setIntroImagePrompt,
  };
};
