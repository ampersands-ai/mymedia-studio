/**
 * Storyboard Render Status Hook
 * Manages dynamic status messages based on elapsed rendering time
 */

import { useState, useEffect } from 'react';

interface UseStoryboardRenderStatusOptions {
  isRendering: boolean;
  renderingStartTime: number | null;
}

/**
 * Hook to manage dynamic render status messages
 * Updates every second with contextual messages based on elapsed time
 * 
 * @param options - Rendering state options
 * @returns Status message and setter function
 */
export const useStoryboardRenderStatus = ({
  isRendering,
  renderingStartTime,
}: UseStoryboardRenderStatusOptions) => {
  const [renderStatusMessage, setRenderStatusMessage] = useState('');

  useEffect(() => {
    if (!isRendering || !renderingStartTime) {
      setRenderStatusMessage('');
      return;
    }

    // Update status message based on elapsed time
    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - renderingStartTime) / 1000);
      
      if (elapsedSeconds < 120) {
        // 0-2 minutes: Normal message
        setRenderStatusMessage(`Rendering started... (typically 1-2 minutes)`);
      } else if (elapsedSeconds < 300) {
        // 2-5 minutes: Taking longer than usual
        setRenderStatusMessage(`Taking longer than usual... still checking status`);
      } else {
        // 5+ minutes: Much longer than expected
        setRenderStatusMessage(`This is taking much longer than expected. Auto-recovery will attempt shortly.`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRendering, renderingStartTime]);

  return {
    renderStatusMessage,
    setRenderStatusMessage,
  };
};
