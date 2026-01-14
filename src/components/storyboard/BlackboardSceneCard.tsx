import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, ImageIcon, Loader2, RefreshCw, Sparkles, Film, ChevronDown, ChevronRight, Video, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPublicImageUrl } from '@/lib/supabase-images';
import type { BlackboardScene } from '@/hooks/storyboard/useBlackboardStoryboard';

interface BlackboardSceneCardProps {
  scene: BlackboardScene;
  index: number;
  totalScenes: number;
  disabled: boolean;
  previousImageUrl?: string;
  previousSceneIsGenerating?: boolean;
  imageCreditCost: number;
  videoCreditCost: number;
  nextSceneHasImage: boolean;
  onUpdate: (updates: Partial<BlackboardScene>) => void;
  onRemove: () => void;
  onRegenerateImage: () => void;
  onRegenerateVideo: () => void;
  onGenerateImage: () => void;
  onGenerateVideo: () => void;
  onCheckStatus: () => void;
}

export function BlackboardSceneCard({
  scene,
  index,
  totalScenes,
  disabled,
  previousSceneIsGenerating = false,
  imageCreditCost,
  videoCreditCost,
  nextSceneHasImage,
  onUpdate,
  onRemove,
  onRegenerateImage,
  onRegenerateVideo,
  onGenerateImage,
  onGenerateVideo,
  onCheckStatus,
}: BlackboardSceneCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isImageGenerating = scene.imageGenerationStatus === 'generating';
  const isVideoGenerating = scene.videoGenerationStatus === 'generating';
  const hasImage = !!scene.generatedImageUrl;
  const hasVideo = !!scene.generatedVideoUrl;
  const isLastScene = index === totalScenes - 1;
  const canGenerateVideo = hasImage && nextSceneHasImage && !isLastScene;

  // Normalize URLs to handle both full URLs and storage paths
  const normalizedImageUrl = scene.generatedImageUrl 
    ? getPublicImageUrl(scene.generatedImageUrl) 
    : undefined;
  const normalizedVideoUrl = scene.generatedVideoUrl 
    ? getPublicImageUrl(scene.generatedVideoUrl, 'generated-content') 
    : undefined;

  // Block generation if seed is enabled and previous scene is still generating
  const waitingForSeed = index > 0 && scene.usePreviousImageAsSeed && previousSceneIsGenerating;
  const canGenerateImage = !waitingForSeed && scene.imagePrompt.trim();

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="rounded-2xl border border-border/40 bg-background/50 backdrop-blur-sm overflow-hidden">
        {/* Collapsible Header */}
        <div className="flex items-center gap-3 p-4">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted/50 rounded-full"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <Badge className="bg-amber-600 hover:bg-amber-600 text-white px-4 py-1.5 text-sm font-bold rounded-full">
            Scene {index + 1}
          </Badge>

          {/* Collapsed state preview */}
          {!isExpanded && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {hasImage && (
                <img
                  src={normalizedImageUrl}
                  alt={`Scene ${index + 1}`}
                  className="w-12 h-12 rounded-lg object-cover border border-border/30"
                />
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(
                  "text-xs",
                  hasImage 
                    ? "bg-green-500/10 text-green-500 border-green-500/30" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {hasImage ? 'Image Ready' : 'No Image'}
                </Badge>
                {!isLastScene && (
                  <Badge variant="outline" className={cn(
                    "text-xs",
                    hasVideo 
                      ? "bg-blue-500/10 text-blue-500 border-blue-500/30" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {hasVideo ? 'Video Ready' : 'No Video'}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="ml-auto">
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
        </div>

        {/* Collapsible Content */}
        <CollapsibleContent>
          <div className="space-y-4 p-4 pt-0">
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

              {/* RIGHT: Unified Preview Card */}
              <div className="space-y-4">
                <Card className="p-4 bg-card/95 backdrop-blur-xl border border-border/30">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      {hasVideo ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      Scene {index + 1} Preview
                    </h4>
                    <div className="flex gap-2">
                      {hasImage && (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                          Image ✓
                        </Badge>
                      )}
                      {hasVideo && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                          Video ✓
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Unified Preview Area - Priority: Video > Image > Empty */}
                  <div className={cn(
                    "relative h-[200px] rounded-xl overflow-hidden border-2 transition-all duration-300",
                    hasVideo 
                      ? "border-blue-500/40 bg-black/5" 
                      : hasImage 
                        ? "border-primary/40 bg-black/5" 
                        : "border-dashed border-muted-foreground/30 bg-muted/20"
                  )}>
                    {isVideoGenerating ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                          <Video className="w-5 h-5 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">Generating Video...</p>
                          <p className="text-xs text-muted-foreground mt-1">This may take a few minutes</p>
                        </div>
                      </div>
                    ) : isImageGenerating ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                          <ImageIcon className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">Generating Image...</p>
                        </div>
                      </div>
                    ) : hasVideo ? (
                      <video
                        src={normalizedVideoUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : hasImage ? (
                      <img
                        src={normalizedImageUrl}
                        alt={`Scene ${index + 1} preview`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Write a prompt and generate
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    {/* Generate/Regenerate Image Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <Button 
                              className={cn(
                                "w-full",
                                hasImage && "bg-muted hover:bg-muted/80 text-foreground",
                                waitingForSeed && "opacity-70"
                              )}
                              variant={hasImage ? "outline" : "default"}
                              onClick={hasImage ? onRegenerateImage : onGenerateImage}
                              disabled={disabled || isImageGenerating || !canGenerateImage}
                            >
                              {isImageGenerating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : waitingForSeed ? (
                                <Clock className="w-4 h-4 mr-2" />
                              ) : hasImage ? (
                                <RefreshCw className="w-4 h-4 mr-2" />
                              ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                              )}
                              {waitingForSeed 
                                ? `Waiting for Scene ${index}...` 
                                : hasImage 
                                  ? 'Regenerate Image' 
                                  : `Image (${imageCreditCost})`}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {waitingForSeed && (
                          <TooltipContent>
                            <p>Scene {index} image must complete first because "Use as seed" is enabled</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>

                    {/* Generate/Regenerate Video Button - Only for non-last scenes */}
                    {!isLastScene && (
                      <Button 
                        className={cn(
                          "flex-1",
                          hasVideo && "bg-muted hover:bg-muted/80 text-foreground"
                        )}
                        variant={hasVideo ? "outline" : "default"}
                        onClick={hasVideo ? onRegenerateVideo : onGenerateVideo}
                        disabled={
                          disabled || 
                          isVideoGenerating || 
                          !canGenerateVideo ||
                          (!hasVideo && !scene.videoPrompt.trim())
                        }
                      >
                        {isVideoGenerating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : hasVideo ? (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        {hasVideo ? 'Regenerate Video' : `Video (${videoCreditCost})`}
                      </Button>
                    )}

                    {/* Check Status Button - shown when generating or has prompt but no preview */}
                    {(isImageGenerating || isVideoGenerating || (!hasImage && scene.imagePrompt.trim()) || (!hasVideo && scene.videoPrompt.trim() && !isLastScene)) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCheckStatus}
                        disabled={disabled}
                        className="h-9 px-2"
                        title="Check database for updates"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
