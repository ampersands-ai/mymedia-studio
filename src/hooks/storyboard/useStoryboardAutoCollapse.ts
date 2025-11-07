/**
 * Storyboard Auto-Collapse Hook
 * Automatically collapses scenes section when rendering starts
 */

import { useEffect } from 'react';

interface UseStoryboardAutoCollapseOptions {
  isRendering: boolean;
  setShowScenes: (show: boolean) => void;
}

/**
 * Hook to auto-collapse scenes when rendering starts
 * Side effect only - no return value
 * 
 * @param options - Rendering state and setter
 */
export const useStoryboardAutoCollapse = ({
  isRendering,
  setShowScenes,
}: UseStoryboardAutoCollapseOptions) => {
  useEffect(() => {
    if (isRendering) {
      setShowScenes(false);
    }
  }, [isRendering, setShowScenes]);
};
