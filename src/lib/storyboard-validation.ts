/**
 * Storyboard Validation Utilities
 * Input validation and credit checking functions
 */

import type { Scene } from '@/types/storyboard';

/**
 * Validate that all scenes are complete with required fields
 * 
 * @param scenes - Array of scene objects
 * @returns Validation result with optional incomplete scene reference
 */
export function validateScenesComplete(scenes: Scene[]): { 
  isValid: boolean; 
  incompleteScene?: Scene 
} {
  const incompleteScene = scenes.find(
    s => !s.voice_over_text || !s.image_prompt
  );
  
  return {
    isValid: !incompleteScene,
    incompleteScene
  };
}

/**
 * Check if user has insufficient credits for an operation
 * 
 * @param tokenBalance - User's current credit balance
 * @param requiredCost - Required credits for the operation
 * @returns True if user has insufficient credits
 */
export function hasInsufficientCredits(
  tokenBalance: number,
  requiredCost: number
): boolean {
  return tokenBalance < requiredCost;
}
