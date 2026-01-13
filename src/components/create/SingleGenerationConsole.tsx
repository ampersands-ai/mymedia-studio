import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, History, Loader2, X } from "lucide-react";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import type { ActiveGeneration } from "@/hooks/useActiveGenerations";

// Auto-dismiss completed items after this duration
const AUTO_DISMISS_MS = 30000;

/**
 * Props for SingleGenerationConsole component
 */
interface SingleGenerationConsoleProps {
  generation: ActiveGeneration;
  onViewHistory: () => void;
}

/**
 * Individual console component for tracking a single generation's progress
 * Shows completion message with history link instead of output preview
 */
export const SingleGenerationConsole = ({
  generation,
  onViewHistory,
}: SingleGenerationConsoleProps) => {
  const [dismissed, setDismissed] = useState(false);
  const isComplete = generation.status === "completed";
  const isFailed = generation.status === "failed";
  const startTime = new Date(generation.created_at).getTime();

  // Auto-dismiss completed/failed items after 30 seconds
  useEffect(() => {
    if (isComplete || isFailed) {
      const timer = setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isComplete, isFailed]);

  // Truncate prompt for display
  const truncatedPrompt = generation.prompt.length > 60 
    ? `${generation.prompt.substring(0, 60)}...` 
    : generation.prompt;

  if (dismissed) return null;

  return (
    <Card className="border-border bg-muted/50">
      <CardContent className="p-4 space-y-3">
        {/* Model badge and prompt preview */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs shrink-0">
            {generation.model_name || "Unknown Model"}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">
            {truncatedPrompt}
          </span>
        </div>

        {isComplete ? (
          /* Completion message - NO OUTPUT PREVIEW */
          <div className="relative flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-600">Complete!</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onViewHistory} size="sm" variant="outline">
                <History className="h-4 w-4 mr-1" />
                View in History
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : isFailed ? (
          /* Failed message */
          <div className="relative flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-destructive">Generation failed</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onViewHistory} size="sm" variant="outline">
                <History className="h-4 w-4 mr-1" />
                View Details
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Progress indicator */
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating...</span>
            </div>
            <GenerationProgress
              startTime={startTime}
              isComplete={false}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
