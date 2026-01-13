import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Trash2, ImageIcon, Video, Loader2, Check, X, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  onGenerateImage: () => void;
  onGenerateVideo: () => void;
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
  onGenerateImage,
  onGenerateVideo,
}: BlackboardSceneCardProps) {
  const isImageGenerating = scene.imageGenerationStatus === 'generating';
  const isVideoGenerating = scene.videoGenerationStatus === 'generating';
  const hasImage = !!scene.generatedImageUrl;
  const hasVideo = !!scene.generatedVideoUrl;

  return (
    <Card className="relative bg-card/95 backdrop-blur-xl border border-border/30 hover:border-border/50 transition-all duration-300">
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
              className="h-8 w-8 p-0 hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Section - Side by Side */}
        <div className="p-4 rounded-xl bg-background/50 border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Image</Label>
            {scene.imageGenerationStatus === 'complete' && (
              <Check className="w-4 h-4 text-green-500 ml-auto" />
            )}
            {scene.imageGenerationStatus === 'failed' && (
              <X className="w-4 h-4 text-destructive ml-auto" />
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-[1fr,240px] gap-4">
            {/* Left: Prompt + Toggle */}
            <div className="space-y-3">
              <Textarea
                value={scene.imagePrompt}
                onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
                placeholder="Describe the image for this scene..."
                disabled={disabled}
                className="min-h-[100px] resize-none bg-background/50"
              />
              
              {/* Seed toggle for Scene 2+ */}
              {index > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/20">
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

            {/* Right: Enhanced Preview */}
            <div className="space-y-2">
              <div className={cn(
                "relative rounded-xl overflow-hidden border-2 h-[160px] transition-all duration-300",
                hasImage 
                  ? "border-primary/30 bg-black/5" 
                  : "border-dashed border-muted-foreground/30 bg-muted/30"
              )}>
                {isImageGenerating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-xs font-medium text-muted-foreground">Generating...</p>
                  </div>
                ) : hasImage ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={scene.generatedImageUrl}
                      alt={`Scene ${index + 1} image`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-xs text-white/90 bg-black/40 backdrop-blur-sm rounded px-2 py-1">
                          ✅ Ready for video render
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                    <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground/60 text-center">No image yet</p>
                  </div>
                )}
              </div>
              
              {/* Action Button */}
              {hasImage ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-background/50 hover:bg-background"
                  onClick={onRegenerateImage}
                  disabled={disabled || isImageGenerating}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isImageGenerating && "animate-spin")} />
                  Regenerate
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={onGenerateImage}
                  disabled={disabled || isImageGenerating || !scene.imagePrompt.trim()}
                >
                  <Sparkles className={cn("w-3.5 h-3.5 mr-1.5", isImageGenerating && "animate-spin")} />
                  Generate Image
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Video Section - only show for non-last scenes */}
        {index < totalScenes - 1 && (
          <div className="p-4 rounded-xl bg-background/50 border border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">
                Video (Scene {index + 1} → {index + 2})
              </Label>
              {scene.videoGenerationStatus === 'complete' && (
                <Check className="w-4 h-4 text-green-500 ml-auto" />
              )}
              {scene.videoGenerationStatus === 'failed' && (
                <X className="w-4 h-4 text-destructive ml-auto" />
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-[1fr,240px] gap-4">
              {/* Left: Prompt */}
              <Textarea
                value={scene.videoPrompt}
                onChange={(e) => onUpdate({ videoPrompt: e.target.value })}
                placeholder="Describe the motion/transition between images..."
                disabled={disabled}
                className="min-h-[100px] resize-none bg-background/50"
              />

              {/* Right: Enhanced Video Preview */}
              <div className="space-y-2">
                <div className={cn(
                  "relative rounded-xl overflow-hidden border-2 h-[160px] transition-all duration-300",
                  hasVideo 
                    ? "border-primary/30 bg-black/5" 
                    : "border-dashed border-muted-foreground/30 bg-muted/30"
                )}>
                  {isVideoGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-xs font-medium text-muted-foreground">Generating video...</p>
                    </div>
                  ) : hasVideo ? (
                    <div className="relative w-full h-full group">
                      <video
                        src={scene.generatedVideoUrl}
                        className="w-full h-full object-cover"
                        controls
                        muted
                        loop
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-xs text-white/90 bg-black/40 backdrop-blur-sm rounded px-2 py-1">
                            ✅ Video ready
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                      <Video className="w-10 h-10 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground/60 text-center">No video yet</p>
                    </div>
                  )}
                </div>
                
                {/* Action Button */}
                {hasVideo ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-background/50 hover:bg-background"
                    onClick={onRegenerateVideo}
                    disabled={disabled || isVideoGenerating}
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isVideoGenerating && "animate-spin")} />
                    Regenerate
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={onGenerateVideo}
                    disabled={disabled || isVideoGenerating || !hasImage}
                  >
                    <Sparkles className={cn("w-3.5 h-3.5 mr-1.5", isVideoGenerating && "animate-spin")} />
                    Generate Video
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
