/**
 * Storyboard Keyboard Navigation Hook
 * Handles global keyboard shortcuts for scene navigation
 */

import { useEffect } from 'react';

interface UseStoryboardKeyboardNavOptions {
  navigateScene: (direction: 'prev' | 'next') => void;
}

/**
 * Hook to handle keyboard navigation for scenes
 * Listens for ArrowLeft/ArrowRight keys globally
 * 
 * @param options - Navigation function
 */
export const useStoryboardKeyboardNav = ({
  navigateScene,
}: UseStoryboardKeyboardNavOptions) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateScene('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateScene('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateScene]);
};
