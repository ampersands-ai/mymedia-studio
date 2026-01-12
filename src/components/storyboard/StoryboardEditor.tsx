/**
 * Storyboard Editor - Refactored
 * Main component orchestrating storyboard editing and video rendering
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { Json } from '@/integrations/supabase/types';
import { useStoryboard } from '@/hooks/useStoryboard';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useVideoUrl } from '@/hooks/media/useVideoUrl';
import { useStoryboardLocalState } from '@/hooks/storyboard/useStoryboardLocalState';
import { useStoryboardCostCalculator } from '@/hooks/storyboard/useStoryboardCostCalculator';
import { useStoryboardRenderStatus } from '@/hooks/storyboard/useStoryboardRenderStatus';
import { useIntroSceneSync } from '@/hooks/storyboard/useIntroSceneSync';
import { useStoryboardKeyboardNav } from '@/hooks/storyboard/useStoryboardKeyboardNav';
import { useStoryboardAutoCollapse } from '@/hooks/storyboard/useStoryboardAutoCollapse';
import { validateScenesComplete, hasInsufficientCredits } from '@/lib/storyboard-validation';
import { RenderStatusAlert } from './RenderStatusAlert';
import { StuckVideoAlert } from './StuckVideoAlert';
import { StoryboardHeader } from './StoryboardHeader';
import { ScenesCollapsible } from './ScenesCollapsible';
import { IntroSceneCard } from './IntroSceneCard';
import { SceneCardWithPreview } from './SceneCardWithPreview';
import { VoiceAndSettingsPanel } from './VoiceAndSettingsPanel';
import { RenderVideoButton } from './RenderVideoButton';
import { RerenderConfirmDialog } from './RerenderConfirmDialog';
import { FinalVideoPlayer } from './FinalVideoPlayer';
import { BulkPreviewGenerator } from './BulkPreviewGenerator';
import { BulkAnimationGenerator } from './BulkAnimationGenerator';
import { GeneratingOutputConsole } from './GeneratingOutputConsole';
import { SubtitleCustomizer } from './SubtitleCustomizer';
import type { SubtitleSettings } from '@/types/subtitle';

export const StoryboardEditor = () => {
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(true);
  // Main storyboard hook
  const {
    storyboard,
    scenes,
    activeSceneId,
    isRendering,
    renderProgress,
    renderingStartTime,
    updateScene,
    updateIntroScene,
    regenerateScene,
    setActiveScene,
    navigateScene,
    renderVideo,
    cancelRender,
    isCancelingRender,
    refreshStatus,
    updateSceneImage,
    updateRenderSettings,
    generateAllScenePreviews,
    generateAllSceneAnimations,
  } = useStoryboard();
  
  const { availableCredits } = useUserCredits();
  
  // Video URL
  const { url: videoSignedUrl, isLoading: isLoadingVideo } = useVideoUrl(
    storyboard?.status === 'complete' ? (storyboard.video_storage_path ?? null) : null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );
  
  // Modular hooks
  const { state, updateState, setShowScenes, setShowSubtitleCustomizer } = 
    useStoryboardLocalState(storyboard ?? null);
  
  const { initialEstimate, actualRenderCost, costDifference } = 
    useStoryboardCostCalculator(storyboard ?? null, scenes);
  
  const { renderStatusMessage } = 
    useStoryboardRenderStatus({ isRendering, renderingStartTime });
  
  const { introVoiceOverText, setIntroVoiceOverText, introImagePrompt, setIntroImagePrompt } = 
    useIntroSceneSync({ storyboard: storyboard ?? null, updateIntroScene });
  
  // Side effect hooks
  useStoryboardKeyboardNav({ navigateScene });
  useStoryboardAutoCollapse({ isRendering, setShowScenes });
  
  // Handlers
  const handleRender = async () => {
    const validation = validateScenesComplete(scenes);
    if (!validation.isValid) {
      toast.error('Please complete all scenes before rendering');
      return;
    }
    
    if (hasInsufficientCredits(availableCredits, actualRenderCost)) {
      toast.error(`Insufficient credits. Need ${actualRenderCost.toFixed(2)} credits to render video.`);
      return;
    }
    
    // Immediate feedback to reduce perceived lag
    toast.loading('Starting video render...', { id: 'render-starting' });
    
    try {
      const result = await renderVideo(false, notifyOnCompletion);
      
      toast.dismiss('render-starting');
      
      if (result?.requiresConfirmation) {
        updateState({
          rerenderCost: result.renderCost,
          existingVideoUrl: result.existingVideoUrl,
          showRerenderDialog: true,
        });
        return;
      }
      
      toast.success('Video rendering started!');
    } catch (error) {
      toast.dismiss('render-starting');
      logger.error('Video rendering failed to start', error instanceof Error ? error : new Error(String(error)), {
        component: 'StoryboardEditor',
        operation: 'handleRender',
        storyboardId: storyboard?.id,
        sceneCount: scenes.length
      });
      toast.error('Failed to start rendering. Please try again.');
    }
  };
  
  const handleConfirmRerender = async () => {
    updateState({ showRerenderDialog: false });
    try {
      await renderVideo(true, notifyOnCompletion);
      toast.success('Video re-rendering started!');
    } catch (error) {
      logger.error('Video re-rendering failed to start', error instanceof Error ? error : new Error(String(error)), {
        component: 'StoryboardEditor',
        operation: 'handleConfirmRerender',
        storyboardId: storyboard?.id
      });
      toast.error('Failed to start re-rendering. Please try again.');
    }
  };
  
  const handleImageGenerated = useCallback((sceneId: string, imageUrl: string) => {
    if (!storyboard) return;
    
    if (sceneId === storyboard.id) {
      if (storyboard.intro_image_preview_url !== imageUrl) {
        updateIntroScene('intro_image_preview_url', imageUrl);
      }
    } else {
      const scene = scenes.find(s => s.id === sceneId);
      if (scene && scene.image_preview_url !== imageUrl) {
        updateSceneImage({ sceneId, imageUrl });
      }
    }
  }, [storyboard, scenes, updateIntroScene, updateSceneImage]);
  
  if (!storyboard || scenes.length === 0) return null;

  const isQuickMode = storyboard.render_mode === 'quick';
  
  return (
    <div className="space-y-6">
      {/* Rendering Status Alert */}
      {isRendering && renderStatusMessage && (
        <RenderStatusAlert
          renderStatusMessage={renderStatusMessage}
          onCheckStatus={refreshStatus}
          onCancelRender={cancelRender}
          isCanceling={isCancelingRender}
        />
      )}
      
      
      {/* Stuck Video Alert */}
      <StuckVideoAlert
        isStuck={storyboard?.status === 'rendering' && !isRendering}
        onCheckStatus={refreshStatus}
      />
      
      {/* Header */}
      <StoryboardHeader
        sceneCount={scenes.length}
        estimatedDuration={storyboard.duration}
      />
      
      {/* Scenes Section - Only show in customize mode */}
      {!isQuickMode && (
        <ScenesCollapsible
          open={state.showScenes}
          onOpenChange={setShowScenes}
          isRendering={isRendering}
          isComplete={storyboard.status === 'complete'}
        >
          <BulkPreviewGenerator
            storyboard={storyboard}
            scenes={scenes}
            onGenerateAll={generateAllScenePreviews}
          />
          
          <BulkAnimationGenerator
            storyboard={storyboard}
            scenes={scenes}
            onAnimateAll={generateAllSceneAnimations}
          />
          
          <IntroSceneCard
            storyboard={storyboard}
            introVoiceOverText={introVoiceOverText}
            onIntroTextChange={setIntroVoiceOverText}
            introImagePrompt={introImagePrompt}
            onIntroPromptChange={setIntroImagePrompt}
            disabled={isRendering}
            onImageGenerated={handleImageGenerated}
            hasNextScene={scenes.length > 0}
            nextSceneImageUrl={scenes[0]?.image_preview_url || null}
          />
          
          {scenes.map((scene, idx) => {
            // Get next scene info (if exists)
            const nextScene = idx < scenes.length - 1 ? scenes[idx + 1] : null;
            const nextSceneImageUrl = nextScene?.image_preview_url || null;
            const hasNextScene = nextScene !== null;
            
            return (
              <SceneCardWithPreview
                key={scene.id}
                scene={scene}
                sceneNumber={idx + 2}
                isActive={activeSceneId === scene.id}
                onUpdate={updateScene}
                onRegenerate={regenerateScene}
                onClick={() => setActiveScene(scene.id)}
                onImageGenerated={handleImageGenerated}
                aspectRatio={storyboard?.aspect_ratio}
                nextSceneImageUrl={nextSceneImageUrl}
                hasNextScene={hasNextScene}
              />
            );
          })}
        </ScenesCollapsible>
      )}
      
      {/* Voice & Settings */}
      <VoiceAndSettingsPanel
        storyboard={storyboard}
        isRendering={isRendering}
        onUpdateSettings={(settings) => {
          updateRenderSettings(settings as Parameters<typeof updateRenderSettings>[0]);
        }}
        onOpenSubtitleCustomizer={() => setShowSubtitleCustomizer(true)}
      />
      
      {/* Generation Progress Console */}
      {isRendering && (
        <GeneratingOutputConsole
          progress={renderProgress}
          statusMessage={renderStatusMessage}
          elapsedTime={renderingStartTime ? Date.now() - renderingStartTime : 0}
          onCheckStatus={refreshStatus}
          onCancelRender={cancelRender}
          isCanceling={isCancelingRender}
        />
      )}
      
      {/* Render Button */}
      {!isRendering && (
        <RenderVideoButton
          isRendering={isRendering}
          tokenBalance={availableCredits}
          actualRenderCost={actualRenderCost}
          initialEstimate={initialEstimate}
          costDifference={costDifference}
          estimatedDuration={storyboard.duration}
          sceneCount={scenes.length}
          notifyOnCompletion={notifyOnCompletion}
          onNotifyOnCompletionChange={setNotifyOnCompletion}
          onRender={handleRender}
          disabled={false}
        />
      )}
      
      {/* Re-render Dialog */}
      <RerenderConfirmDialog
        open={state.showRerenderDialog}
        onOpenChange={(open) => updateState({ showRerenderDialog: open })}
        rerenderCost={state.rerenderCost}
        tokenBalance={availableCredits}
        onConfirm={handleConfirmRerender}
      />
      
      {/* Final Video */}
      {storyboard.status === 'complete' && storyboard.video_url && (
        <FinalVideoPlayer
          videoUrl={videoSignedUrl}
          storyboardId={storyboard.id}
          isLoading={isLoadingVideo}
          storagePath={storyboard.video_storage_path}
        />
      )}
      
      {/* Subtitle Customizer */}
      <SubtitleCustomizer
        open={state.showSubtitleCustomizer}
        onOpenChange={setShowSubtitleCustomizer}
        initialSettings={storyboard.subtitle_settings as Partial<SubtitleSettings>}
        onSave={(settings) => {
          updateRenderSettings({ subtitle_settings: settings as unknown as Json });
          setShowSubtitleCustomizer(false);
        }}
      />
    </div>
  );
};
