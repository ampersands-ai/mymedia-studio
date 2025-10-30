import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SceneCard } from './SceneCard';
import { StoryboardPreview } from './StoryboardPreview';
import { useStoryboard } from '@/hooks/useStoryboard';
import { Play, ArrowLeft, Coins, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserTokens } from '@/hooks/useUserTokens';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const StoryboardEditor = () => {
  const navigate = useNavigate();
  const {
    storyboard,
    scenes,
    activeSceneId,
    isRendering,
    renderProgress,
    updateScene,
    regenerateScene,
    setActiveScene,
    navigateScene,
    renderVideo,
    clearStoryboard,
  } = useStoryboard();
  const { data: tokenData } = useUserTokens();

  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];
  const estimatedDuration = storyboard ? storyboard.duration : 0;
  const renderCost = 800;

  // Keyboard navigation
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

  const handleRender = async () => {
    // Validate all scenes
    const incompleteScene = scenes.find(
      s => !s.voice_over_text || !s.image_prompt
    );
    if (incompleteScene) {
      toast.error('Please complete all scenes before rendering');
      return;
    }

    if ((tokenData?.tokens_remaining || 0) < renderCost) {
      toast.error('Insufficient credits');
      return;
    }

    await renderVideo();
  };

  const handleBack = () => {
    clearStoryboard();
  };

  if (!storyboard || scenes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Input
          </Button>
          <div className="hidden md:block text-sm text-muted-foreground">
            {scenes.length} scenes • ~{estimatedDuration}s video
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Scene Cards */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold">📋 Scenes</h3>
          {scenes.map((scene, idx) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              sceneNumber={idx + 1}
              isActive={activeSceneId === scene.id}
              onUpdate={updateScene}
              onRegenerate={regenerateScene}
              onClick={() => setActiveScene(scene.id)}
            />
          ))}
        </div>

        {/* Preview Panel */}
        <div className="lg:sticky lg:top-24 h-fit">
          <h3 className="text-lg font-bold mb-4">👁️ Preview</h3>
          <StoryboardPreview
            scene={activeScene}
            totalScenes={scenes.length}
            onPrevious={() => navigateScene('prev')}
            onNext={() => navigateScene('next')}
          />
        </div>
      </div>

      {/* Render Dialog */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur border-t z-50">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <Coins className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">
              Balance: <span className="font-semibold text-foreground">{Number(tokenData?.tokens_remaining || 0).toFixed(2)}</span>
            </span>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="lg"
                disabled={isRendering || (tokenData?.tokens_remaining || 0) < renderCost}
                className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:scale-105 transition-transform font-bold"
              >
                {isRendering ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Rendering... {renderProgress}%
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Render Video (800 credits)
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Render Video?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    This will create your final video with {scenes.length} scenes.
                  </p>
                  <p className="font-semibold">
                    Cost: {renderCost} credits • Est. time: ~60 seconds
                  </p>
                  <p className="text-xs">
                    Current balance: {Number(tokenData?.tokens_remaining || 0).toFixed(2)} credits
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRender}>
                  Render Video
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Add padding to prevent content from being hidden by fixed bar */}
      <div className="h-24" />
    </div>
  );
};