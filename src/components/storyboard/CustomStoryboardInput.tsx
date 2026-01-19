import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Film, Plus, Check } from 'lucide-react';
import { ResolutionSelector } from './sections/ResolutionSelector';
import { useCustomStoryboard } from '@/hooks/storyboard/useCustomStoryboard';
import { toast } from 'sonner';
import { CustomSceneCard } from './CustomSceneCard';

interface CustomScene {
  voiceOverText: string;
  imagePrompt: string;
  imageUrl?: string;
  videoUrl?: string;
}

export function CustomStoryboardInput() {
  const [aspectRatio, setAspectRatio] = useState('hd');
  const [scenes, setScenes] = useState<CustomScene[]>([
    { voiceOverText: '', imagePrompt: '', imageUrl: '', videoUrl: '' }
  ]);
  const { createCustomStoryboard, isCreating } = useCustomStoryboard();

  const handleAddScene = () => {
    setScenes([...scenes, { voiceOverText: '', imagePrompt: '', imageUrl: '', videoUrl: '' }]);
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
              <CustomSceneCard
                key={index}
                scene={scene}
                index={index}
                totalScenes={scenes.length}
                disabled={isCreating}
                onUpdate={(field, value) => handleUpdateScene(index, field, value)}
                onRemove={() => handleRemoveScene(index)}
              />
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
