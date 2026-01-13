import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Trash2, ImageIcon, Video, Loader2, Check, X, RefreshCw } from 'lucide-react';
import type { BlackboardScene } from '@/hooks/storyboard/useBlackboardStoryboard';

interface BlackboardSceneCardProps {
  scene: BlackboardScene;
  index: number;
  totalScenes: number;
  disabled: boolean;
  previousImageUrl?: string;
  onUpdate: (updates: Partial<BlackboardScene>) => void;
  onRemove: () => void;
  onRegenerateImage: () => void;
  onRegenerateVideo: () => void;
}

export function BlackboardSceneCard({
  scene,
  index,
  totalScenes,
  disabled,
  onUpdate,
  onRemove,
  onRegenerateImage,
  onRegenerateVideo,
}: BlackboardSceneCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'complete':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <X className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const isImageGenerating = scene.imageGenerationStatus === 'generating';
  const isVideoGenerating = scene.videoGenerationStatus === 'generating';

  return (
    <Card className="relative bg-muted/30 border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            Scene {index + 1}
            {index < totalScenes - 1 && (
              <span className="text-xs text-muted-foreground font-normal">
                → Video to Scene {index + 2}
              </span>
            )}
          </CardTitle>
          {totalScenes > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Section - Side by Side */}
        <div className="p-3 rounded-lg bg-background/50 border">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Image</Label>
            {getStatusIcon(scene.imageGenerationStatus)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-[1fr,180px] gap-4">
            {/* Left: Prompt + Toggle */}
            <div className="space-y-3">
              <Textarea
                value={scene.imagePrompt}
                onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
                placeholder="Describe the image for this scene..."
                disabled={disabled}
                className="min-h-[80px] resize-none"
              />
              
              {/* Seed toggle for Scene 2+ */}
              {index > 0 && (
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <Label className="text-xs text-muted-foreground cursor-pointer">
                    Use Scene {index} image as seed
                  </Label>
                  <Switch
                    checked={scene.usePreviousImageAsSeed}
                    onCheckedChange={(checked) => onUpdate({ usePreviousImageAsSeed: checked })}
                    disabled={disabled}
                  />
                </div>
              )}
            </div>

            {/* Right: Preview + Regenerate */}
            <div className="space-y-2">
              {scene.generatedImageUrl ? (
                <>
                  <div className="relative rounded-lg overflow-hidden border-2 border-primary/30">
                    <img
                      src={scene.generatedImageUrl}
                      alt={`Scene ${index + 1} image`}
                      className="w-full h-32 object-cover"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onRegenerateImage}
                    disabled={disabled || isImageGenerating}
                  >
                    {isImageGenerating ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Regenerate
                  </Button>
                </>
              ) : (
                <div className="h-32 bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  {isImageGenerating ? (
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Section - only show for non-last scenes */}
        {index < totalScenes - 1 && (
          <div className="p-3 rounded-lg bg-background/50 border">
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">
                Video (Scene {index + 1} → {index + 2})
              </Label>
              {getStatusIcon(scene.videoGenerationStatus)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-[1fr,180px] gap-4">
              {/* Left: Prompt */}
              <Textarea
                value={scene.videoPrompt}
                onChange={(e) => onUpdate({ videoPrompt: e.target.value })}
                placeholder="Describe the motion/transition between images..."
                disabled={disabled}
                className="min-h-[80px] resize-none"
              />

              {/* Right: Preview + Regenerate */}
              <div className="space-y-2">
                {scene.generatedVideoUrl ? (
                  <>
                    <div className="relative rounded-lg overflow-hidden border-2 border-primary/30">
                      <video
                        src={scene.generatedVideoUrl}
                        className="w-full h-32 object-cover"
                        controls
                        muted
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={onRegenerateVideo}
                      disabled={disabled || isVideoGenerating}
                    >
                      {isVideoGenerating ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1" />
                      )}
                      Regenerate
                    </Button>
                  </>
                ) : (
                  <div className="h-32 bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                    {isVideoGenerating ? (
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    ) : (
                      <Video className="w-8 h-8 text-muted-foreground/50" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
