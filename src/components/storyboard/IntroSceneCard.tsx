/**
 * Intro Scene Card Component
 * Displays and edits the title/intro scene (Scene 1)
 */

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScenePreviewGenerator } from './ScenePreviewGenerator';
import type { Storyboard } from '@/types/storyboard';

interface IntroSceneCardProps {
  storyboard: Storyboard;
  introVoiceOverText: string;
  onIntroTextChange: (text: string) => void;
  introImagePrompt: string;
  onIntroPromptChange: (prompt: string) => void;
  disabled: boolean;
  onImageGenerated: (sceneId: string, imageUrl: string) => void;
}

/**
 * Title/intro scene card with voiceover and image prompt inputs
 * Includes integrated preview generator
 */
export const IntroSceneCard = ({
  storyboard,
  introVoiceOverText,
  onIntroTextChange,
  introImagePrompt,
  onIntroPromptChange,
  disabled,
  onImageGenerated,
}: IntroSceneCardProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <Card className="relative p-4 bg-primary/5 backdrop-blur-xl border-2 border-primary/30 lg:col-span-2 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="px-2 py-1 rounded-md bg-primary/30 text-primary text-xs font-bold">
            Scene 1 - Title
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <Label className="text-xs font-semibold text-muted-foreground">🎤 Voiceover</Label>
          <Textarea
            value={introVoiceOverText}
            onChange={(e) => onIntroTextChange(e.target.value)}
            className="min-h-[80px] text-sm bg-background/50"
            maxLength={1000}
            placeholder="Title voiceover text..."
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">🖼️ Image Prompt</Label>
          <Textarea
            value={introImagePrompt}
            onChange={(e) => onIntroPromptChange(e.target.value)}
            className="min-h-[160px] sm:min-h-[200px] text-sm bg-background/50 resize-y"
            maxLength={2000}
            placeholder="Title scene visual description..."
            disabled={disabled}
          />
        </div>
      </Card>
      
      <div className="lg:col-span-1 h-full">
        <ScenePreviewGenerator
          scene={{
            id: storyboard.id,
            image_prompt: introImagePrompt,
            image_preview_url: storyboard.intro_image_preview_url,
          }}
          sceneNumber={1}
          onImageGenerated={onImageGenerated}
        />
      </div>
    </div>
  );
};
