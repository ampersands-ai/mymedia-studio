import { useCallback } from 'react';
import { useStoryboardState } from './storyboard/useStoryboardState';
import { useStoryboardGeneration } from './storyboard/useStoryboardGeneration';
import { useStoryboardScenes } from './storyboard/useStoryboardScenes';
import { useStoryboardRendering } from './storyboard/useStoryboardRendering';
import { useStoryboardSettings } from './storyboard/useStoryboardSettings';

export const useStoryboard = () => {
  // State management
  const {
    currentStoryboardId,
    setAndPersistStoryboardId,
    activeSceneId,
    setActiveSceneId,
    storyboard,
    scenes,
    isLoading,
  } = useStoryboardState();

  // Generation logic
  const { isGenerating, generateStoryboard } = useStoryboardGeneration(
    setAndPersistStoryboardId,
    setActiveSceneId
  );

  // Scene operations
  const {
    updateScene,
    updateIntroScene,
    regenerateScene,
    navigateScene,
    updateSceneImage,
    generateAllScenePreviews,
  } = useStoryboardScenes(
    currentStoryboardId,
    storyboard,
    scenes,
    activeSceneId,
    setActiveSceneId
  );

  // Rendering operations
  const {
    isRendering,
    renderProgress,
    renderingStartTime,
    renderVideo,
    cancelRender,
    isCancelingRender,
    refreshStatus,
  } = useStoryboardRendering(currentStoryboardId, storyboard);

  // Settings operations
  const { updateRenderSettings } = useStoryboardSettings(currentStoryboardId);

  // Clear storyboard helper
  const clearStoryboard = useCallback(() => {
    setAndPersistStoryboardId(null);
    setActiveSceneId(null);
  }, [setAndPersistStoryboardId, setActiveSceneId]);

  return {
    storyboard,
    scenes,
    activeSceneId,
    isGenerating,
    isRendering,
    renderProgress,
    renderingStartTime,
    isLoading,
    generateStoryboard,
    updateScene,
    updateIntroScene,
    regenerateScene,
    setActiveScene: setActiveSceneId,
    navigateScene,
    renderVideo,
    cancelRender,
    isCancelingRender,
    clearStoryboard,
    refreshStatus,
    updateSceneImage,
    updateRenderSettings,
    generateAllScenePreviews,
  };
};
