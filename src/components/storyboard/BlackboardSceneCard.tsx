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
                  <div className="group relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-primary/5 to-primary/10 ring-1 ring-primary/20 hover:ring-primary/40">
                    {/* Blur placeholder while loading */}
                    <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
                    <img
                      src={scene.generatedImageUrl}
                      alt={`Scene ${index + 1} image`}
                      className="relative w-full h-36 object-cover transition-all duration-500 group-hover:scale-105"
                      onLoad={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.previousElementSibling?.classList.add('hidden');
                      }}
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full hover:bg-primary/10 transition-colors"
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
                <div className="h-36 bg-gradient-to-br from-muted/30 to-muted/60 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-muted-foreground/40">
                  {isImageGenerating ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">Generating...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                      <span className="text-xs text-muted-foreground/60">No image yet</span>
                    </div>
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
                    <div className="group relative rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-primary/5 to-primary/10 ring-1 ring-primary/20 hover:ring-primary/40">
                      <video
                        src={scene.generatedVideoUrl}
                        className="w-full h-36 object-cover"
                        controls
                        muted
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full hover:bg-primary/10 transition-colors"
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
                  <div className="h-36 bg-gradient-to-br from-muted/30 to-muted/60 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-muted-foreground/40">
                    {isVideoGenerating ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">Generating...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Video className="w-8 h-8 text-muted-foreground/40" />
                        <span className="text-xs text-muted-foreground/60">No video yet</span>
                      </div>
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
