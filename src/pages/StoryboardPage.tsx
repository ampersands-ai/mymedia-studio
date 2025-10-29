import { useState, useEffect } from 'react';
import { StoryboardInput } from '@/components/storyboard/StoryboardInput';
import { StoryboardEditor } from '@/components/storyboard/StoryboardEditor';
import { useStoryboard } from '@/hooks/useStoryboard';
import { Film, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export default function StoryboardPage() {
  const { storyboard } = useStoryboard();
  const [showInputForm, setShowInputForm] = useState(true);

  // Auto-collapse form when storyboard is generated
  useEffect(() => {
    if (storyboard) {
      setShowInputForm(false);
    }
  }, [storyboard]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Film className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              AI STORYBOARD GENERATOR
            </h1>
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
          
          <CollapsibleContent>
            <StoryboardInput />
          </CollapsibleContent>
        </Collapsible>

        {/* Storyboard Editor */}
        {storyboard && <StoryboardEditor />}
      </div>
    </div>
  );
}
