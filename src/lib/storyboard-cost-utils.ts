/**
 * Storyboard Cost Calculation Utilities
 * Handles token cost estimation and calculation based on script character changes
 */

import type { Storyboard, Scene } from '@/types/storyboard';

/**
 * Count characters in text (trimmed length)
 */
export function countCharacters(text: string): number {
  return text?.trim().length || 0;
}

/**
 * Get sanitized initial estimate from storyboard
 * Handles invalid rawEstimate values with fallback logic
 * 
 * @param storyboard - The storyboard object
 * @returns Sanitized initial cost estimate in credits
 */
export function getInitialEstimate(storyboard: Storyboard): number {
  const rawEstimate = storyboard?.estimated_render_cost ?? 0;
  const expectedEstimate = (storyboard?.duration || 0) * 0.25; // 0.25 credits/sec
  
  // Check if estimate is invalid
  const isInvalid = !Number.isFinite(rawEstimate) || 
                    rawEstimate <= 0 || 
                    rawEstimate > Math.max(100, expectedEstimate * 10);
  
  return isInvalid ? expectedEstimate : rawEstimate;
}

/**
 * Calculate actual render cost based on script character changes
 * 
 * Logic:
 * - Base cost = initial estimate
 * - If script increased by 100+ characters: add 0.25 credits per 100 chars
 * - If script decreased by 100+ characters: reduce 0.25 credits per 100 chars
 * - Never goes below 0
 * 
 * @param storyboard - The storyboard object
 * @param scenes - Array of scene objects
 * @param initialEstimate - The sanitized initial estimate
 * @returns Object with final cost and character difference
 */
export function calculateRenderCost(
  storyboard: Storyboard,
  scenes: Scene[],
  initialEstimate: number
): { cost: number; charDifference: number } {
  // Calculate current total character count
  const introChars = countCharacters(storyboard.intro_voiceover_text || '');
  const sceneChars = scenes.reduce((sum, scene) => 
    sum + countCharacters(scene.voice_over_text || ''), 0
  );
  const currentTotalChars = introChars + sceneChars;
  
  // Get original character count (stored at creation time)
  const originalChars = (storyboard as any).original_character_count || currentTotalChars;
  
  // Calculate character difference
  const charDifference = currentTotalChars - originalChars;
  
  // Start with initial estimate
  let cost = initialEstimate;
  
  // Adjust cost based on character changes
  if (charDifference >= 100) {
    // Script increased: add 0.25 credits per 100 chars
    const additionalChunks = Math.floor(charDifference / 100);
    cost += additionalChunks * 0.25;
  } else if (charDifference <= -100) {
    // Script decreased: reduce 0.25 credits per 100 chars
    const reducedChunks = Math.floor(Math.abs(charDifference) / 100);
    cost -= reducedChunks * 0.25;
    cost = Math.max(0, cost); // Never go below 0
  }
  
  return { cost, charDifference };
}
