import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StoryboardInput } from '@/components/storyboard/StoryboardInput';
import { StoryboardEditor } from '@/components/storyboard/StoryboardEditor';
import { StoryboardModeSelector } from '@/components/storyboard/StoryboardModeSelector';
import { useStoryboard } from '@/hooks/useStoryboard';
import { Film, ChevronDown, RotateCcw, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function StoryboardPage() {
  const queryClient = useQueryClient();
  const { execute } = useErrorHandler();
  const { storyboard, scenes, clearStoryboard } = useStoryboard();
  const [showInputForm, setShowInputForm] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Show mode selector when storyboard is generated without a render_mode set
  useEffect(() => {
    if (storyboard && !storyboard.render_mode) {
      setShowModeSelector(true);
      setShowInputForm(false);
    } else if (storyboard) {
      setShowModeSelector(false);
      setShowInputForm(false);
    } else {
      setShowModeSelector(false);
      setShowInputForm(true);
    }
  }, [storyboard]);

  const handleModeSelection = async (mode: 'quick' | 'customize') => {
    if (!storyboard) return;
    
    try {
      const { error } = await supabase
        .from('storyboards')
        .update({ render_mode: mode })
        .eq('id', storyboard.id);

      if (error) throw error;

      // Invalidate and refetch the storyboard query
      await queryClient.invalidateQueries({ queryKey: ['storyboard', storyboard.id] });
      setShowModeSelector(false);
      toast.success(mode === 'quick' ? 'Quick mode selected' : 'Customize mode selected');
    } catch (error) {
      console.error('Failed to update render mode:', error);
      toast.error('Failed to save mode selection');
    }
  };

  const handleReset = async () => {
    if (storyboard?.id) {
      setShowResetDialog(true);
    }
  };

  const confirmReset = async () => {
    await execute(
      async () => {
        const { error } = await supabase.functions.invoke('delete-storyboard', {
          body: { storyboardId: storyboard?.id }
        });

        if (error) throw error;

        clearStoryboard();
      },
      {
        successMessage: 'Storyboard deleted',
        errorMessage: 'Failed to delete storyboard',
        context: {
          component: 'StoryboardPage',
          operation: 'confirmReset',
          storyboardId: storyboard?.id,
        }
      }
    );
    setShowResetDialog(false);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Film className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black">
              AI STORYBOARD
              <span className="inline-flex items-center gap-1 text-sm md:text-base font-medium text-muted-foreground ml-2">
                <Coins className="w-4 h-4" />
                from 0.3/s
              </span>
            </h1>
            {storyboard && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2 ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground">
            Create professional faceless videos with full creative control
          </p>
        </div>

        {/* Collapsible Input Form */}
        <Collapsible open={showInputForm} onOpenChange={setShowInputForm} className="mb-6">
          {storyboard && (
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full mb-4">
                {showInputForm ? 'Hide Input Form' : 'Show Input Form'}
                <ChevronDown className={cn(
                  "ml-2 h-4 w-4 transition-transform",
                  showInputForm && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
          )}
          
          <CollapsibleContent forceMount className={cn(!showInputForm && "hidden")}>
            <StoryboardInput />
          </CollapsibleContent>
        </Collapsible>

        {/* Storyboard Editor - only show when mode is selected */}
        {storyboard && storyboard.render_mode && <StoryboardEditor />}
      </div>

      {/* Mode Selector Dialog */}
      {storyboard && (
        <StoryboardModeSelector
          open={showModeSelector}
          onSelectMode={handleModeSelection}
          sceneCount={scenes.length}
          estimatedDuration={storyboard.duration}
        />
      )}

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Storyboard?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your current storyboard. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
