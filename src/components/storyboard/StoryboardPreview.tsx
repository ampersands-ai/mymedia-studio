import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface Scene {
  id: string;
  order_number: number;
  voice_over_text: string;
  image_prompt: string;
}

interface StoryboardPreviewProps {
  scene: Scene | null;
  totalScenes: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const StoryboardPreview = ({
  scene,
  totalScenes,
  onPrevious,
  onNext,
}: StoryboardPreviewProps) => {
  if (!scene) {
    return (
      <Card className="p-8 text-center bg-white/5 backdrop-blur-xl border-white/20">
        <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Select a scene to preview</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-xl border-primary/20">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-background/50">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-muted-foreground">
            Scene {scene.order_number} of {totalScenes}
          </h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onPrevious}
              disabled={scene.order_number === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onNext}
              disabled={scene.order_number === totalScenes}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="p-6 space-y-6">
        {/* Image Preview */}
        <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 flex items-center justify-center">
          <div className="text-center space-y-2 p-6">
            <Eye className="w-12 h-12 mx-auto text-primary/50" />
            <p className="text-xs text-muted-foreground max-w-md">
              Image will be generated during rendering
            </p>
            <p className="text-xs font-mono text-muted-foreground/50 line-clamp-3">
              {scene.image_prompt}
            </p>
          </div>
        </div>

        {/* Voiceover Text */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Voiceover</h4>
          <div className="p-4 rounded-lg bg-background/50 border border-border/50">
            <p className="text-sm leading-relaxed">{scene.voice_over_text}</p>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border/50">
          Use <kbd className="px-2 py-0.5 rounded bg-muted">←</kbd> and{' '}
          <kbd className="px-2 py-0.5 rounded bg-muted">→</kbd> to navigate
        </div>
      </div>
    </Card>
  );
};