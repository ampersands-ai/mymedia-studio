import { useState, useEffect } from 'react';
import { StoryboardInput } from '@/components/storyboard/StoryboardInput';
import { StoryboardEditor } from '@/components/storyboard/StoryboardEditor';
import { useStoryboard } from '@/hooks/useStoryboard';
import { Film, ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useErrorHandler } from '@/hooks/useErrorHandler';
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
  const { execute } = useErrorHandler();
  const { storyboard, clearStoryboard } = useStoryboard();
  const [showInputForm, setShowInputForm] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Auto-collapse form when storyboard is generated, re-expand when cleared
  useEffect(() => {
    if (storyboard) {
      setShowInputForm(false);
    } else {
      setShowInputForm(true);
    }
  }, [storyboard]);

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
        toastId: 'storyboard-reset',
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Film className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                AI STORYBOARD GENERATOR
              </h1>
            </div>
            {storyboard && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
          <p className="text-lg text-muted-foreground">
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

        {/* Storyboard Editor */}
        {storyboard && <StoryboardEditor />}
      </div>

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
