/**
 * Storyboard Cost Calculator Hook
 * Calculates render costs based on script character changes
 */

import { useMemo } from 'react';
import type { Storyboard, Scene } from '@/types/storyboard';
import { getInitialEstimate, calculateRenderCost } from '@/lib/storyboard-cost-utils';

/**
 * Hook to calculate render costs with character tracking
 * 
 * @param storyboard - Current storyboard object
 * @param scenes - Array of scene objects
 * @returns Cost breakdown object
 */
export const useStoryboardCostCalculator = (
  storyboard: Storyboard | null,
  scenes: Scene[]
) => {
  // Get sanitized initial estimate
  const initialEstimate = useMemo(() => {
    if (!storyboard) return 0;
    return getInitialEstimate(storyboard);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyboard?.estimated_render_cost, storyboard?.duration]);

  // Calculate actual cost based on character changes
  const { actualRenderCost, charDifference } = useMemo(() => {
    if (!storyboard) {
      return { actualRenderCost: 0, charDifference: 0 };
    }

    const { cost, charDifference } = calculateRenderCost(
      storyboard,
      scenes,
      initialEstimate
    );

    return {
      actualRenderCost: cost,
      charDifference,
    };
  }, [storyboard, scenes, initialEstimate]);

  // Calculate cost difference
  const costDifference = actualRenderCost - initialEstimate;

  return {
    initialEstimate,
    actualRenderCost,
    costDifference,
    charDifference,
  };
};
