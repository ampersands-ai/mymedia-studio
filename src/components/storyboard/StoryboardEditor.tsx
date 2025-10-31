import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { SceneCard } from './SceneCard';
import { ScenePreviewGenerator } from './ScenePreviewGenerator';
import { StoryboardPreview } from './StoryboardPreview';
import { useStoryboard } from '@/hooks/useStoryboard';
import { Play, ArrowLeft, Coins, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserTokens } from '@/hooks/useUserTokens';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    renderingStartTime,
    updateScene,
    updateIntroScene,
    regenerateScene,
    setActiveScene,
    navigateScene,
    renderVideo,
    clearStoryboard,
    refreshStatus,
    updateSceneImage,
  } = useStoryboard();
  const { data: tokenData } = useUserTokens();
  const [renderStatusMessage, setRenderStatusMessage] = useState('');
  const [introVoiceOverText, setIntroVoiceOverText] = useState(storyboard?.intro_voiceover_text || '');
  const [introImagePrompt, setIntroImagePrompt] = useState(storyboard?.intro_image_prompt || '');

  // Sync intro fields with storyboard
  useEffect(() => {
    if (storyboard) {
      setIntroVoiceOverText(storyboard.intro_voiceover_text || '');
      setIntroImagePrompt(storyboard.intro_image_prompt || '');
    }
  }, [storyboard?.intro_voiceover_text, storyboard?.intro_image_prompt]);

  // Debounced save for intro fields
  useEffect(() => {
    const timer = setTimeout(() => {
      if (storyboard && introVoiceOverText !== storyboard.intro_voiceover_text) {
        updateIntroScene('intro_voiceover_text', introVoiceOverText);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [introVoiceOverText, storyboard?.intro_voiceover_text, updateIntroScene]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (storyboard && introImagePrompt !== storyboard.intro_image_prompt) {
        updateIntroScene('intro_image_prompt', introImagePrompt);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [introImagePrompt, storyboard?.intro_image_prompt, updateIntroScene]);

  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];
  const estimatedDuration = storyboard ? storyboard.duration : 0;
  const initialEstimate = storyboard?.estimated_render_cost || 0;
  
  // Calculate actual render cost based on script character changes
  const calculateRenderCost = useCallback(() => {
    if (!storyboard) return 0;
    
    const countChars = (text: string) => text?.trim().length || 0;
    
    // Calculate current total character count
    const introChars = countChars(storyboard.intro_voiceover_text || '');
    const sceneChars = scenes.reduce((sum, scene) => sum + countChars(scene.voice_over_text || ''), 0);
    const currentTotalChars = introChars + sceneChars;
    
    // Get original character count (stored at creation)
    const originalChars = (storyboard as any).original_character_count || currentTotalChars;
    
    // Calculate character difference
    const charDifference = currentTotalChars - originalChars;
    
    // Start with initial estimate
    let cost = initialEstimate;
    
    // If script increased by 100+ characters, add 0.25 credits per 100 chars
    if (charDifference >= 100) {
      const additionalChunks = Math.floor(charDifference / 100);
      cost += additionalChunks * 0.25;
    }
    // If script decreased by 100+ characters, reduce cost proportionally
    else if (charDifference <= -100) {
      const reducedChunks = Math.floor(Math.abs(charDifference) / 100);
      cost -= reducedChunks * 0.25;
      cost = Math.max(0, cost); // Never go below 0
    }
    
    return cost;
  }, [storyboard, scenes, initialEstimate]);
  
  const actualRenderCost = calculateRenderCost();
  const costDifference = actualRenderCost - initialEstimate;
  
  // Display price: show initial estimate if actual is same/higher, show actual if lower
  const displayPrice = actualRenderCost >= initialEstimate ? initialEstimate : actualRenderCost;
  const showSavings = actualRenderCost < initialEstimate;

  // Phase 5: Dynamic status messages based on rendering time
  useEffect(() => {
    if (!isRendering || !renderingStartTime) {
      setRenderStatusMessage('');
      return;
    }

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - renderingStartTime) / 1000);
      
      if (elapsedSeconds < 120) {
        setRenderStatusMessage(`Rendering started... (typically 1-2 minutes)`);
      } else if (elapsedSeconds < 300) {
        setRenderStatusMessage(`Taking longer than usual... still checking status`);
      } else {
        setRenderStatusMessage(`This is taking much longer than expected. Auto-recovery will attempt shortly.`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRendering, renderingStartTime]);

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

    // Check if script increased and user needs to pay additional credits
    if (actualRenderCost > initialEstimate) {
      const additionalCharge = actualRenderCost - initialEstimate;
      if ((tokenData?.tokens_remaining || 0) < additionalCharge) {
        toast.error(`Insufficient credits. Need ${additionalCharge.toFixed(2)} more credits for script changes.`);
        return;
      }
    }

    await renderVideo();
  };

  const handleBack = () => {
    clearStoryboard();
  };

  const handleImageGenerated = useCallback((sceneId: string, imageUrl: string) => {
    if (!storyboard) return;

    // Check if it's the intro scene (using storyboard ID)
    if (sceneId === storyboard.id) {
      // Only update if value actually changed
      if (storyboard.intro_image_preview_url !== imageUrl) {
        updateIntroScene('intro_image_preview_url', imageUrl);
      }
    } else {
      // Find the scene
      const scene = scenes.find(s => s.id === sceneId);
      // Only update if value actually changed
      if (scene && scene.image_preview_url !== imageUrl) {
        updateSceneImage({ sceneId, imageUrl });
      }
    }
  }, [storyboard, scenes, updateIntroScene, updateSceneImage]);

  if (!storyboard || scenes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Phase 5: Rendering Status Alert */}
      {isRendering && renderStatusMessage && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{renderStatusMessage}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStatus}
              className="ml-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Show Refresh button for stuck videos */}
      {storyboard?.status === 'rendering' && !isRendering && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Video rendering was interrupted. Click to check if it completed.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStatus}
              className="ml-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
          
          {/* Title/Intro Scene (Scene 0) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <Card className="relative p-4 bg-primary/5 backdrop-blur-xl border-2 border-primary/30">
              <div className="flex items-center justify-between mb-4">
                <div className="px-2 py-1 rounded-md bg-primary/30 text-primary text-xs font-bold">
                  Scene 0 - Title
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <Label className="text-xs font-semibold text-muted-foreground">🎤 Voiceover</Label>
                <Textarea
                  value={introVoiceOverText}
                  onChange={(e) => setIntroVoiceOverText(e.target.value)}
                  className="min-h-[80px] text-sm bg-background/50"
                  maxLength={1000}
                  placeholder="Title voiceover text..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">🖼️ Image Prompt</Label>
                <Textarea
                  value={introImagePrompt}
                  onChange={(e) => setIntroImagePrompt(e.target.value)}
                  className="min-h-[160px] sm:min-h-[200px] text-sm bg-background/50 resize-y"
                  maxLength={2000}
                  placeholder="Title scene visual description..."
                />
              </div>
            </Card>
            <ScenePreviewGenerator
              scene={{
                id: storyboard.id,
                image_prompt: introImagePrompt,
                image_preview_url: storyboard.intro_image_preview_url,
              }}
              sceneNumber={0}
              onImageGenerated={handleImageGenerated}
            />
          </div>

          {scenes.map((scene, idx) => (
            <div key={scene.id} className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <SceneCard
                scene={scene}
                sceneNumber={idx + 1}
                isActive={activeSceneId === scene.id}
                onUpdate={updateScene}
                onRegenerate={regenerateScene}
                onClick={() => setActiveScene(scene.id)}
              />
              <ScenePreviewGenerator
                scene={scene}
                sceneNumber={idx + 1}
                onImageGenerated={handleImageGenerated}
              />
            </div>
          ))}
        </div>

        {/* Preview Panel */}
        <div className="lg:sticky lg:top-24 h-fit space-y-4">
          {/* Completed Video Player */}
          {storyboard?.status === 'complete' && storyboard?.video_url && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold">🎬 Final Video</h3>
              <div className="rounded-lg overflow-hidden border border-primary/20 bg-black">
                <video
                  controls
                  className="w-full aspect-video"
                  src={storyboard.video_url}
                  poster={storyboard.video_url.replace(/\.[^.]+$/, '.jpg')}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(storyboard.video_url, '_blank')}
                >
                  Open in New Tab
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={async () => {
                    try {
                      const response = await fetch(storyboard.video_url!);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `storyboard-${storyboard.id}.mp4`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                      toast.success('Video downloaded!');
                    } catch (error) {
                      toast.error('Failed to download video');
                    }
                  }}
                >
                  Download
                </Button>
              </div>
            </div>
          )}

          {/* Scene Preview */}
          <div>
            <h3 className="text-lg font-bold mb-4">👁️ Scene Preview</h3>
            <StoryboardPreview
              scene={activeScene}
              totalScenes={scenes.length}
              onPrevious={() => navigateScene('prev')}
              onNext={() => navigateScene('next')}
            />
          </div>
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
                disabled={isRendering || (actualRenderCost > initialEstimate && (tokenData?.tokens_remaining || 0) < (actualRenderCost - initialEstimate))}
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
                    Render Video ({displayPrice.toFixed(2)} credits)
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
                  <div className="space-y-2">
                    {showSavings ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Originally charged:</span>
                          <span className="line-through text-muted-foreground">{initialEstimate.toFixed(2)} credits</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Final price:</span>
                          <span className="font-bold text-green-600">{actualRenderCost.toFixed(2)} credits</span>
                        </div>
                        <p className="text-xs text-green-600">
                          {Math.abs(costDifference).toFixed(2)} credits refund - script shortened!
                        </p>
                      </>
                    ) : actualRenderCost > initialEstimate ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Originally charged:</span>
                          <span>{initialEstimate.toFixed(2)} credits</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Script increase charge:</span>
                          <span className="text-amber-600">+{costDifference.toFixed(2)} credits</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-semibold">Total price:</span>
                          <span className="font-bold">{actualRenderCost.toFixed(2)} credits</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Script expanded by {Math.floor(Math.abs(costDifference / 0.25) * 100)}+ characters
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Final price:</span>
                          <span className="font-bold">{displayPrice.toFixed(2)} credits</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Same as original - already charged.
                        </p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    {actualRenderCost > initialEstimate && costDifference > (tokenData?.tokens_remaining || 0) 
                      ? `Insufficient balance. Need ${costDifference.toFixed(2)} more credits.`
                      : `Current balance: ${Number(tokenData?.tokens_remaining || 0).toFixed(2)} credits`} • Est. time: ~60s
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