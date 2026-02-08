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
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl sm:text-2xl font-bold">Choose Your Path</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Your storyboard is ready with {sceneCount} scenes (~{estimatedDuration}s)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
          {/* Quick Mode */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:border-primary hover:shadow-lg",
              "group relative overflow-hidden"
            )}
            onClick={() => onSelectMode('quick')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-4 sm:p-6 relative">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <h3 className="font-bold text-base sm:text-lg">Quick Mode</h3>
              </div>
              
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Skip scene editing. AI generates all visuals during render based on your prompts.
              </p>
              
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span>Faster workflow</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span>AI-generated visuals</span>
                </div>
              </div>
              
              <Button className="w-full mt-4 sm:mt-6 text-sm" variant="default">
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
            <CardContent className="p-4 sm:p-6 relative">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 rounded-lg bg-secondary/50">
                  <Palette className="h-5 w-5 sm:h-6 sm:w-6 text-secondary-foreground" />
                </div>
                <h3 className="font-bold text-base sm:text-lg">Customize Mode</h3>
              </div>
              
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Edit each scene's script and prompts. Generate image previews and animations.
              </p>
              
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span>Full creative control</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span>{sceneCount} scenes to customize</span>
                </div>
              </div>
              
              <Button className="w-full mt-4 sm:mt-6 text-sm" variant="outline">
                Customize Scenes
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
