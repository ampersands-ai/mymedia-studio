import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Palette, Plus, ImageIcon, Video, Film, Loader2, RotateCcw, Coins } from 'lucide-react';
import { ResolutionSelector } from './sections/ResolutionSelector';
import { BlackboardSceneCard } from './BlackboardSceneCard';
import { BlackboardStoryboardSelector } from './BlackboardStoryboardSelector';
import { BlackboardRenderOptions, RenderOptions } from './BlackboardRenderOptions';
import { useBlackboardStoryboard, VideoModelType } from '@/hooks/storyboard/useBlackboardStoryboard';
import { useBlackboardStoryboardList } from '@/hooks/storyboard/useBlackboardStoryboardList';
import { useUserCredits } from '@/hooks/useUserCredits';

export function BlackboardStoryboardInput() {
  const [showRenderOptions, setShowRenderOptions] = useState(false);
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
  } = useBlackboardStoryboard();

  const { storyboards, isLoading: isLoadingList, refetch: refetchList } = useBlackboardStoryboardList();
  const { availableCredits } = useUserCredits();

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
              onClick={resetAll}
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
              <RadioGroupItem value="first_last_frames" id="first_last" className="peer sr-only" />
              <Label 
                htmlFor="first_last" 
                className="flex flex-col gap-1 p-4 rounded-xl border-2 border-border/40 bg-muted/20 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/40"
              >
                <span className="font-semibold text-sm">Veo3 Image-to-Video</span>
                <span className="text-xs text-muted-foreground">
                  First/last frame transition ({videoCreditCost} credits)
                </span>
              </Label>
            </div>
            <div className="relative">
              <RadioGroupItem value="reference" id="reference" className="peer sr-only" />
              <Label 
                htmlFor="reference" 
                className="flex flex-col gap-1 p-4 rounded-xl border-2 border-border/40 bg-muted/20 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/40"
              >
                <span className="font-semibold text-sm">Veo3 Reference</span>
                <span className="text-xs text-muted-foreground">
                  Style reference material ({videoCreditCost} credits)
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

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {scenes.map((scene, index) => (
              <BlackboardSceneCard
                key={scene.id}
                scene={scene}
                index={index}
                totalScenes={scenes.length}
                disabled={isProcessing}
                previousImageUrl={index > 0 ? scenes[index - 1].generatedImageUrl : undefined}
                imageCreditCost={imageCreditCost}
                videoCreditCost={videoCreditCost}
                nextSceneHasImage={index < scenes.length - 1 && !!scenes[index + 1]?.generatedImageUrl}
                onUpdate={(updates) => updateScene(scene.id, updates)}
                onRemove={() => removeScene(scene.id)}
                onGenerateImage={() => generateImage(scene.id)}
                onRegenerateImage={() => regenerateImage(scene.id)}
                onGenerateVideo={() => generateVideo(scene.id)}
                onRegenerateVideo={() => regenerateVideo(scene.id)}
                onCheckStatus={() => checkSceneStatus(scene.id)}
              />
            ))}
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
              onClick={() => {
                const a = document.createElement('a');
                a.href = finalVideoUrl;
                a.download = 'blackboard-video.mp4';
                a.click();
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
      </CardContent>
    </Card>
  );
}
