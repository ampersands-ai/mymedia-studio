import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationProgressProps {
  startTime: number;
  isComplete: boolean;
  completedAt?: number;
  className?: string;
}

export const GenerationProgress = ({ 
  startTime, 
  isComplete, 
  completedAt,
  className 
}: GenerationProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      if (completedAt) {
        setElapsedTime((completedAt - startTime) / 1000);
      }
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const elapsedSeconds = elapsed / 1000;
      
      // Linear progression from 0% to 90% over 60 seconds
      if (elapsedSeconds <= 60) {
        setProgress(Math.floor((elapsedSeconds / 60) * 90));
      } else {
        // Stay at 90% after 60 seconds
        setProgress(90);
      }
      
      setElapsedTime(elapsedSeconds);
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [startTime, isComplete, completedAt]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          <span className="text-sm font-medium">
            {isComplete ? "Generation Complete" : "Generating..."}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{elapsedTime.toFixed(1)}s</span>
        </div>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{progress}%</span>
        {isComplete && (
          <span className="text-green-600 dark:text-green-400 font-medium">
            ✓ Generated in {elapsedTime.toFixed(1)} seconds
          </span>
        )}
      </div>
    </div>
  );
};