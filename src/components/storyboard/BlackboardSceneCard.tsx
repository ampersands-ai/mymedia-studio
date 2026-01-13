import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, ImageIcon, Video, Loader2, Check, X } from 'lucide-react';
import { useModels } from '@/hooks/useModels';
import { ModelFamilySelector } from '@/components/custom-creation/ModelFamilySelector';
import type { BlackboardScene } from '@/hooks/storyboard/useBlackboardStoryboard';

interface BlackboardSceneCardProps {
  scene: BlackboardScene;
  index: number;
  totalScenes: number;
  disabled: boolean;
  onUpdate: (updates: Partial<BlackboardScene>) => void;
  onRemove: () => void;
}

export function BlackboardSceneCard({
  scene,
  index,
  totalScenes,
  disabled,
  onUpdate,
  onRemove,
}: BlackboardSceneCardProps) {
  const { data: allModels = [], isLoading: modelsLoading } = useModels();
  
  // Filter models by content type
  const imageModels = allModels.filter(m => m.content_type === 'prompt_to_image');
  const videoModels = allModels.filter(m => m.content_type === 'image_to_video');

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
        {/* Image Section */}
        <div className="space-y-3 p-3 rounded-lg bg-background/50 border">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Image Generation</Label>
            {getStatusIcon(scene.imageGenerationStatus)}
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Image Prompt</Label>
            <Textarea
              value={scene.imagePrompt}
              onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
              placeholder="Describe the image for this scene..."
              disabled={disabled}
              className="min-h-[60px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Image Model</Label>
            <ModelFamilySelector
              models={imageModels}
              selectedModel={scene.imageModelId}
              onModelChange={(modelId) => onUpdate({ imageModelId: modelId })}
              selectedGroup="prompt_to_image"
              isLoading={modelsLoading}
            />
          </div>

          {/* Image Preview */}
          {scene.generatedImageUrl && (
            <div className="relative rounded-lg overflow-hidden border-2 border-primary/30">
              <img
                src={scene.generatedImageUrl}
                alt={`Scene ${index + 1} image`}
                className="w-full h-32 object-cover"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background"
                onClick={() => onUpdate({ generatedImageUrl: undefined, imageGenerationStatus: 'idle' })}
              >
                ×
              </Button>
            </div>
          )}
        </div>

        {/* Video Section - only show for non-last scenes */}
        {index < totalScenes - 1 && (
          <div className="space-y-3 p-3 rounded-lg bg-background/50 border">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">Video Generation</Label>
              {getStatusIcon(scene.videoGenerationStatus)}
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Video Prompt (Image {index + 1} → Image {index + 2})
              </Label>
              <Textarea
                value={scene.videoPrompt}
                onChange={(e) => onUpdate({ videoPrompt: e.target.value })}
                placeholder="Describe the motion/transition between images..."
                disabled={disabled}
                className="min-h-[60px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Video Model</Label>
              <ModelFamilySelector
                models={videoModels}
                selectedModel={scene.videoModelId}
                onModelChange={(modelId) => onUpdate({ videoModelId: modelId })}
                selectedGroup="image_to_video"
                isLoading={modelsLoading}
              />
            </div>

            {/* Video Preview */}
            {scene.generatedVideoUrl && (
              <div className="relative rounded-lg overflow-hidden border-2 border-primary/30">
                <video
                  src={scene.generatedVideoUrl}
                  className="w-full h-32 object-cover"
                  controls
                  muted
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background"
                  onClick={() => onUpdate({ generatedVideoUrl: undefined, videoGenerationStatus: 'idle' })}
                >
                  ×
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
