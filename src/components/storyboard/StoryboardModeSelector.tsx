/**
 * Storyboard Mode Selector
 * Dialog that appears after storyboard generation to let users choose between:
 * - Quick mode: Skip scene editing, go directly to voice/render settings
 * - Customize mode: Full scene editing (current behavior)
 */

import { Zap, Palette, Clock, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StoryboardModeSelectorProps {
  open: boolean;
  onSelectMode: (mode: 'quick' | 'customize') => void;
  sceneCount: number;
  estimatedDuration: number;
}

export const StoryboardModeSelector = ({
  open,
  onSelectMode,
  sceneCount,
  estimatedDuration,
}: StoryboardModeSelectorProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">Choose Your Path</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Your storyboard is ready with {sceneCount} scenes (~{estimatedDuration}s)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Quick Mode */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:border-primary hover:shadow-lg",
              "group relative overflow-hidden"
            )}
            onClick={() => onSelectMode('quick')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Quick Mode</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Skip scene editing. AI generates all visuals during render based on your prompts.
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Faster workflow</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span>AI-generated visuals</span>
                </div>
              </div>
              
              <Button className="w-full mt-6" variant="default">
                Continue to Voice & Subtitles
              </Button>
            </CardContent>
          </Card>

          {/* Customize Mode */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:border-primary hover:shadow-lg",
              "group relative overflow-hidden"
            )}
            onClick={() => onSelectMode('customize')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-secondary/50">
                  <Palette className="h-6 w-6 text-secondary-foreground" />
                </div>
                <h3 className="font-bold text-lg">Customize Mode</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Edit each scene's script and prompts. Generate image previews and animations.
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Palette className="h-4 w-4" />
                  <span>Full creative control</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span>{sceneCount} scenes to customize</span>
                </div>
              </div>
              
              <Button className="w-full mt-6" variant="outline">
                Customize Scenes
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
