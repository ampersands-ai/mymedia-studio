import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, ImageIcon, Loader2, RefreshCw, Sparkles, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlackboardScene } from '@/hooks/storyboard/useBlackboardStoryboard';

interface BlackboardSceneCardProps {
  scene: BlackboardScene;
  index: number;
  totalScenes: number;
  disabled: boolean;
  previousImageUrl?: string;
  imageCreditCost: number;
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
  imageCreditCost,
  onUpdate,
  onRemove,
  onRegenerateImage,
  onGenerateImage,
}: BlackboardSceneCardProps) {
  const isImageGenerating = scene.imageGenerationStatus === 'generating';
  const hasImage = !!scene.generatedImageUrl;
  const isLastScene = index === totalScenes - 1;

  return (
    <div className="space-y-4 p-4 rounded-2xl border border-border/40 bg-background/50 backdrop-blur-sm">
      {/* Bold Scene Badge Header */}
      <div className="flex items-center justify-between">
        <Badge className="bg-amber-600 hover:bg-amber-600 text-white px-4 py-1.5 text-sm font-bold rounded-full">
          Scene {index + 1}
        </Badge>
        {totalScenes > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={disabled}
            className="h-8 w-8 p-0 hover:bg-destructive/10 rounded-full"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>

      {/* Main Two-Column Layout for Image */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Prompts */}
        <div className="space-y-4">
          {/* Image Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Image Prompt
            </Label>
            <Textarea
              value={scene.imagePrompt}
              onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
              placeholder="Describe the image for this scene in detail..."
              disabled={disabled}
              className="min-h-[100px] resize-none bg-muted/30 border-border/40 focus:border-primary/50"
            />
          </div>

          {/* Video Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" />
              Video Prompt
              {!isLastScene && (
                <span className="text-xs text-muted-foreground font-normal">
                  (Scene {index + 1} → {index + 2})
                </span>
              )}
            </Label>
            <Textarea
              value={scene.videoPrompt}
              onChange={(e) => onUpdate({ videoPrompt: e.target.value })}
              placeholder={isLastScene 
                ? "Add another scene to enable video generation between scenes..."
                : "Describe the motion/transition between this scene and the next..."
              }
              disabled={disabled || isLastScene}
              className={cn(
                "min-h-[100px] resize-none bg-muted/30 border-border/40 focus:border-primary/50",
                isLastScene && "opacity-50"
              )}
            />
            {isLastScene && (
              <p className="text-xs text-muted-foreground italic">
                This is the last scene. Add another scene to create a video transition.
              </p>
            )}
          </div>

          {/* Seed Toggle (Scene 2+) */}
          {index > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30">
              <Label className="text-sm text-muted-foreground cursor-pointer">
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

        {/* RIGHT: Preview Card */}
        <Card className="p-4 bg-card/95 backdrop-blur-xl border border-border/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Scene {index + 1} Preview
            </h4>
            {hasImage && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                Generated
              </Badge>
            )}
          </div>

          {/* Large Preview Area - 280px */}
          <div className={cn(
            "relative h-[280px] rounded-xl overflow-hidden border-2 transition-all duration-300",
            hasImage 
              ? "border-primary/40 bg-black/5" 
              : "border-dashed border-muted-foreground/30 bg-muted/20"
          )}>
            {isImageGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <ImageIcon className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Generating Image...</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
                </div>
              </div>
            ) : hasImage ? (
              <div className="relative w-full h-full group">
                <img
                  src={scene.generatedImageUrl}
                  alt={`Scene ${index + 1} preview`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-sm text-white font-medium">
                      ✅ Image ready for video generation
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">No preview generated</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Write a prompt and generate to see what this scene will look like
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Generate/Regenerate Button */}
          <Button 
            className={cn(
              "w-full mt-4",
              hasImage && "bg-muted hover:bg-muted/80 text-foreground"
            )}
            variant={hasImage ? "outline" : "default"}
            onClick={hasImage ? onRegenerateImage : onGenerateImage}
            disabled={disabled || isImageGenerating || (!hasImage && !scene.imagePrompt.trim())}
          >
            {isImageGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : hasImage ? (
              <RefreshCw className="w-4 h-4 mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {hasImage ? 'Regenerate Image' : `Generate Preview (${imageCreditCost} credits)`}
          </Button>
        </Card>
      </div>

    </div>
  );
}
