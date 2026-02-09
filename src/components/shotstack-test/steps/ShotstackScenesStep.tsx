import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image as ImageIcon, RefreshCw, Check, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface ShotstackScene {
  id: string;
  sceneNumber: number;
  voiceoverText: string;
  imagePrompt: string;
  imageUrl: string | null;
  isGeneratingImage: boolean;
}

interface ShotstackScenesStepProps {
  scenes: ShotstackScene[];
  onSceneUpdate: (sceneId: string, field: 'voiceoverText' | 'imagePrompt', value: string) => void;
  onGenerateImage: (sceneId: string) => void;
  onGenerateAllImages: () => void;
  onRenderVideo: () => void;
  isGeneratingAll: boolean;
  isDisabled: boolean;
}

export function ShotstackScenesStep({
  scenes,
  onSceneUpdate,
  onGenerateImage,
  onGenerateAllImages,
  onRenderVideo,
  isGeneratingAll,
  isDisabled,
}: ShotstackScenesStepProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set(scenes.slice(0, 2).map(s => s.id)));

  const toggleScene = (sceneId: string) => {
    setExpandedScenes(prev => {
      const next = new Set(prev);
      if (next.has(sceneId)) {
        next.delete(sceneId);
      } else {
        next.add(sceneId);
      }
      return next;
    });
  };

  const allImagesGenerated = scenes.every(s => s.imageUrl);
  const someImagesGenerating = scenes.some(s => s.isGeneratingImage);
  const generatedCount = scenes.filter(s => s.imageUrl).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{scenes.length} scenes</Badge>
          <Badge variant={allImagesGenerated ? 'default' : 'secondary'}>
            {generatedCount}/{scenes.length} images
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerateAllImages}
          disabled={isDisabled || isGeneratingAll || allImagesGenerated || someImagesGenerating}
        >
          {isGeneratingAll || someImagesGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : allImagesGenerated ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              All Generated
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate All Images
            </>
          )}
        </Button>
      </div>

      {/* Scenes List */}
      <div className="space-y-3">
        {scenes.map((scene) => (
          <Collapsible
            key={scene.id}
            open={expandedScenes.has(scene.id)}
            onOpenChange={() => toggleScene(scene.id)}
          >
            <Card className={`border-2 transition-colors ${scene.imageUrl ? 'border-primary/30' : ''}`}>
              <CollapsibleTrigger asChild>
                <button
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                  disabled={isDisabled}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge variant="secondary" className="shrink-0">
                      Scene {scene.sceneNumber}
                    </Badge>
                    <span className="text-sm text-muted-foreground truncate">
                      {scene.voiceoverText.slice(0, 50)}...
                    </span>
                    {scene.imageUrl && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                    {scene.isGeneratingImage && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    )}
                  </div>
                  {expandedScenes.has(scene.id) ? (
                    <ChevronUp className="h-4 w-4 shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
                  )}
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 space-y-4">
                  {/* Voiceover Text */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Voiceover Text
                    </Label>
                    <Textarea
                      value={scene.voiceoverText}
                      onChange={(e) => onSceneUpdate(scene.id, 'voiceoverText', e.target.value)}
                      className="min-h-[60px] text-sm resize-none"
                      disabled={isDisabled}
                    />
                  </div>

                  {/* Image Prompt */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Image Prompt
                    </Label>
                    <Textarea
                      value={scene.imagePrompt}
                      onChange={(e) => onSceneUpdate(scene.id, 'imagePrompt', e.target.value)}
                      className="min-h-[60px] text-sm resize-none"
                      disabled={isDisabled}
                    />
                  </div>

                  {/* Image Preview / Generate Button */}
                  <div className="flex items-start gap-3">
                    {scene.imageUrl ? (
                      <div className="relative group">
                        <img
                          src={scene.imageUrl}
                          alt={`Scene ${scene.sceneNumber}`}
                          className="w-32 h-20 object-cover rounded-md border"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 bg-background/80 transition-opacity"
                          onClick={() => onGenerateImage(scene.id)}
                          disabled={isDisabled || scene.isGeneratingImage}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onGenerateImage(scene.id)}
                        disabled={isDisabled || scene.isGeneratingImage}
                      >
                        {scene.isGeneratingImage ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Generate Image
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Render Button */}
      <Button
        onClick={onRenderVideo}
        disabled={isDisabled || !allImagesGenerated || someImagesGenerating}
        className="w-full min-h-[48px] font-bold"
        size="lg"
      >
        {!allImagesGenerated ? (
          <>
            <ImageIcon className="mr-2 h-4 w-4" />
            Generate All Images First ({generatedCount}/{scenes.length})
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Render Video with Shotstack
          </>
        )}
      </Button>
    </div>
  );
}
