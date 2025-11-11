import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Film, Plus, Trash2, Check } from 'lucide-react';
import { ResolutionSelector } from './sections/ResolutionSelector';
import { useCustomStoryboard } from '@/hooks/storyboard/useCustomStoryboard';
import { toast } from 'sonner';

interface CustomScene {
  voiceOverText: string;
  imagePrompt: string;
}

export function CustomStoryboardInput() {
  const [aspectRatio, setAspectRatio] = useState('hd');
  const [scenes, setScenes] = useState<CustomScene[]>([
    { voiceOverText: '', imagePrompt: '' }
  ]);
  const { createCustomStoryboard, isCreating } = useCustomStoryboard();

  const handleAddScene = () => {
    setScenes([...scenes, { voiceOverText: '', imagePrompt: '' }]);
  };

  const handleRemoveScene = (index: number) => {
    if (scenes.length <= 1) {
      toast.error('You must have at least one scene');
      return;
    }
    setScenes(scenes.filter((_, i) => i !== index));
  };

  const handleUpdateScene = (index: number, field: keyof CustomScene, value: string) => {
    const updated = [...scenes];
    updated[index][field] = value;
    setScenes(updated);
  };

  const handleCreate = async () => {
    // Validate all scenes have content
    const hasEmptyScenes = scenes.some(
      scene => !scene.voiceOverText.trim() || !scene.imagePrompt.trim()
    );

    if (hasEmptyScenes) {
      toast.error('All scenes must have both voice-over text and image prompt');
      return;
    }

    await createCustomStoryboard({
      scenes,
      aspectRatio,
    });
  };

  const canCreate = scenes.every(
    scene => scene.voiceOverText.trim() && scene.imagePrompt.trim()
  ) && !isCreating;

  return (
    <Card className="relative overflow-hidden bg-card border-2">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl font-black flex items-center gap-2">
          <Film className="w-5 h-5" />
          CREATE CUSTOM STORYBOARD
        </CardTitle>
        <CardDescription className="text-sm">
          Add your own scenes manually. Each scene is 5 seconds. Configure voice and captions after creating.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <ResolutionSelector
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          disabled={isCreating}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Scenes ({scenes.length})</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddScene}
              disabled={isCreating}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Scene
            </Button>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {scenes.map((scene, index) => (
              <Card key={index} className="relative bg-muted/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      Scene {index + 1} (5s)
                    </CardTitle>
                    {scenes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveScene(index)}
                        disabled={isCreating}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Voice-Over Text</Label>
                    <Textarea
                      value={scene.voiceOverText}
                      onChange={(e) => handleUpdateScene(index, 'voiceOverText', e.target.value)}
                      placeholder="Enter the narration text for this scene..."
                      disabled={isCreating}
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Image Prompt</Label>
                    <Textarea
                      value={scene.imagePrompt}
                      onChange={(e) => handleUpdateScene(index, 'imagePrompt', e.target.value)}
                      placeholder="Describe the visual for this scene..."
                      disabled={isCreating}
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={!canCreate}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Film className="w-4 h-4 mr-2 animate-pulse" />
              Creating Storyboard...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Done - Customize Settings
            </>
          )}
        </Button>

        {isCreating && (
          <p className="text-sm text-center text-muted-foreground">
            ✨ Creating your custom storyboard...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
