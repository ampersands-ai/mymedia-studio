import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Palette, Plus, ImageIcon, Video, Film, Loader2, RotateCcw, Coins, XCircle } from 'lucide-react';
import { ResolutionSelector } from './sections/ResolutionSelector';
import { BlackboardSceneCard } from './BlackboardSceneCard';
import { BlackboardStoryboardSelector } from './BlackboardStoryboardSelector';
import { BlackboardRenderOptions, RenderOptions } from './BlackboardRenderOptions';
import { useBlackboardStoryboard, VideoModelType } from '@/hooks/storyboard/useBlackboardStoryboard';
import { useBlackboardStoryboardList } from '@/hooks/storyboard/useBlackboardStoryboardList';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useIsMobile } from '@/hooks/use-mobile';

// Stuck threshold: 5 minutes
const STUCK_THRESHOLD_MS = 5 * 60 * 1000;

export function BlackboardStoryboardInput() {
  const [showRenderOptions, setShowRenderOptions] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const {
    scenes,
    aspectRatio,
    setAspectRatio,
    videoModelType,
    setVideoModelType,
    addScene,
    removeScene,
    updateScene,
    generateAllImages,
    generateAllVideos,
    renderFinalVideo,
    resetAll,
    generateImage,
    regenerateImage,
    generateVideo,
    regenerateVideo,
    checkSceneStatus,
    isGeneratingImages,
    isGeneratingVideos,
    isRendering,
    finalVideoUrl,
    estimatedCost,
    totalEstimatedCost,
    imageCreditCost,
    videoCreditCost,
    isLoading,
    isSaving,
    storyboardId,
    loadStoryboard,
    createNewStoryboard,
    deleteStoryboard,
    videoGenerationStartTime,
    cancelVideoGeneration,
  } = useBlackboardStoryboard();

  const { storyboards, isLoading: isLoadingList, refetch: refetchList } = useBlackboardStoryboardList();
  const { availableCredits } = useUserCredits();

  // Check for stuck state
  useEffect(() => {
    if (!isGeneratingVideos || !videoGenerationStartTime) {
      setIsStuck(false);
      return;
    }

    const checkStuck = () => {
      const elapsed = Date.now() - videoGenerationStartTime;
      setIsStuck(elapsed > STUCK_THRESHOLD_MS);
    };

    // Check immediately and then every 10 seconds
    checkStuck();
    const interval = setInterval(checkStuck, 10000);

    return () => clearInterval(interval);
  }, [isGeneratingVideos, videoGenerationStartTime]);

  const allImagesGenerated = scenes.every(s => s.generatedImageUrl);
  const allVideosGenerated = scenes.slice(0, -1).every(s => s.generatedVideoUrl);
  const hasAnyImagePrompt = scenes.some(s => s.imagePrompt.trim());
  const hasAnyVideoPrompt = scenes.slice(0, -1).some(s => s.videoPrompt.trim());

  const isProcessing = isGeneratingImages || isGeneratingVideos || isRendering || isLoading;

  const handleSelectStoryboard = async (id: string) => {
    await loadStoryboard(id);
    refetchList();
  };

  const handleCreateNew = async () => {
    await createNewStoryboard();
    refetchList();
  };

  const handleDeleteStoryboard = async (id: string) => {
    await deleteStoryboard(id);
    refetchList();
  };

  return (
    <Card className="relative overflow-hidden bg-card border-2">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Palette className="w-5 h-5" />
            BLACKBOARD STORYBOARD
          </CardTitle>
          <div className="flex items-center gap-2">
            <BlackboardStoryboardSelector
              currentStoryboardId={storyboardId}
              storyboards={storyboards}
              isLoading={isLoadingList}
              disabled={isProcessing}
              onSelectStoryboard={handleSelectStoryboard}
              onCreateNew={handleCreateNew}
              onDeleteStoryboard={handleDeleteStoryboard}
            />
            {isSaving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetConfirmation(true)}
              disabled={isProcessing}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
        <CardDescription className="text-sm">
          Generate images for each scene, then create videos between adjacent scenes, and finally stitch them together.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Resolution Selector */}
        <ResolutionSelector
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          disabled={isProcessing}
        />

        {/* Video Model Selector */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Video Generation Model</Label>
          <RadioGroup 
            value={videoModelType} 
            onValueChange={(value) => setVideoModelType(value as VideoModelType)}
            disabled={isProcessing}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div className="relative">
              <RadioGroupItem value="lite" id="lite" className="peer sr-only" />
              <Label 
                htmlFor="lite" 
                className="flex flex-col gap-1 p-4 rounded-xl border-2 border-border/40 bg-muted/20 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/40"
              >
                <span className="font-semibold text-sm">Veo3.1 Lite</span>
                <span className="text-xs text-muted-foreground">
                  Fast video generation (30 credits)
                </span>
              </Label>
            </div>
            <div className="relative">
              <RadioGroupItem value="hq" id="hq" className="peer sr-only" />
              <Label 
                htmlFor="hq" 
                className="flex flex-col gap-1 p-4 rounded-xl border-2 border-border/40 bg-muted/20 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/40"
              >
                <span className="font-semibold text-sm">Veo3.1 HQ</span>
                <span className="text-xs text-muted-foreground">
                  Higher quality video (125 credits)
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Scenes List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Scenes ({scenes.length})</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addScene}
              disabled={isProcessing}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Scene
            </Button>
          </div>

          <div className="space-y-3 sm:space-y-4 max-h-[500px] overflow-y-auto pr-1 sm:pr-2">
            {scenes.map((scene, index) => {
              // On mobile: only one scene expanded at a time (accordion)
              // On desktop: all scenes can be expanded independently (default first one)
              const isExpanded = isMobile 
                ? expandedSceneId === scene.id 
                : (expandedSceneId === scene.id || (expandedSceneId === null && index === 0));
              
              const handleToggleExpand = () => {
                if (isMobile) {
                  // Accordion: toggle between this scene and none
                  setExpandedSceneId(expandedSceneId === scene.id ? null : scene.id);
                } else {
                  // Desktop: toggle independently
                  setExpandedSceneId(expandedSceneId === scene.id ? null : scene.id);
                }
              };
              
              return (
                <BlackboardSceneCard
                  key={scene.id}
                  scene={scene}
                  index={index}
                  totalScenes={scenes.length}
                  disabled={isProcessing}
                  previousImageUrl={index > 0 ? scenes[index - 1].generatedImageUrl : undefined}
                  previousSceneIsGenerating={index > 0 && scenes[index - 1]?.imageGenerationStatus === 'generating'}
                  imageCreditCost={imageCreditCost}
                  videoCreditCost={videoCreditCost}
                  nextSceneHasImage={index < scenes.length - 1 && !!scenes[index + 1]?.generatedImageUrl}
                  isExpanded={isExpanded}
                  onToggleExpand={handleToggleExpand}
                  onUpdate={(updates) => updateScene(scene.id, updates)}
                  onRemove={() => removeScene(scene.id)}
                  onGenerateImage={() => generateImage(scene.id)}
                  onRegenerateImage={() => regenerateImage(scene.id)}
                  onGenerateVideo={() => generateVideo(scene.id)}
                  onRegenerateVideo={() => regenerateVideo(scene.id)}
                  onCheckStatus={() => checkSceneStatus(scene.id)}
                />
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Cost Estimation */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Coins className="w-4 h-4" />
            Estimated Cost Breakdown
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>Images: ~{estimatedCost.images} credits</div>
            <div>Videos: ~{estimatedCost.videos} credits</div>
            <div>Stitching: ~{estimatedCost.stitching.toFixed(1)} credits</div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm font-medium">Total Estimated:</span>
            <span className="text-sm font-bold text-primary">~{totalEstimatedCost.toFixed(1)} credits</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Available: {availableCredits.toFixed(1)} credits
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Step 1: Generate All Images */}
          <Button
            onClick={generateAllImages}
            disabled={!hasAnyImagePrompt || isProcessing}
            className="w-full"
            variant={allImagesGenerated ? "secondary" : "default"}
          >
            {isGeneratingImages ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Images...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 mr-2" />
                {allImagesGenerated ? 'All Images Generated ✓' : '1. Generate All Images'}
              </>
            )}
          </Button>

          {/* Step 2: Generate All Videos */}
          <div className="space-y-2">
            <Button
              onClick={generateAllVideos}
              disabled={!allImagesGenerated || !hasAnyVideoPrompt || isProcessing || scenes.length < 2}
              className="w-full"
              variant={allVideosGenerated ? "secondary" : "default"}
            >
              {isGeneratingVideos ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Videos...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  {allVideosGenerated ? 'All Videos Generated ✓' : '2. Generate All Videos'}
                </>
              )}
            </Button>
            
            {/* Cancel button for stuck generation */}
            {isGeneratingVideos && isStuck && (
              <Button
                onClick={cancelVideoGeneration}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Stuck Generation
              </Button>
            )}
          </div>

          {/* Step 3: Render Final Video */}
          <Button
            onClick={() => setShowRenderOptions(true)}
            disabled={!allVideosGenerated || isProcessing}
            className="w-full"
          >
            {isRendering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rendering Final Video...
              </>
            ) : (
              <>
                <Film className="w-4 h-4 mr-2" />
                3. Render Final Video
              </>
            )}
          </Button>
        </div>

        {/* Render Options Dialog */}
        <BlackboardRenderOptions
          open={showRenderOptions}
          onOpenChange={setShowRenderOptions}
          onRender={(options: RenderOptions) => {
            setShowRenderOptions(false);
            renderFinalVideo(options);
          }}
          isRendering={isRendering}
        />

        {/* Final Video Preview */}
        {finalVideoUrl && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Final Video</Label>
            <div className="rounded-lg overflow-hidden border-2 border-primary">
              <video
                src={finalVideoUrl}
                className="w-full"
                controls
                autoPlay
                muted
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const response = await fetch(finalVideoUrl);
                  if (!response.ok) throw new Error('Download failed');
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'blackboard-video.mp4';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch {
                  window.open(finalVideoUrl, '_blank');
                }
              }}
            >
              Download Video
            </Button>
          </div>
        )}

        {isProcessing && (
          <p className="text-sm text-center text-muted-foreground">
            ✨ Processing your blackboard storyboard...
          </p>
        )}

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={showResetConfirmation} onOpenChange={setShowResetConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Blackboard?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all scenes, generated images, and videos. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  resetAll();
                  setShowResetConfirmation(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
