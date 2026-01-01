import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, Clock, ExternalLink, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Maximum time to wait in "Setting up" phase before assuming API has started (12 seconds)
const MAX_SETUP_TIME_MS = 12000;

interface GenerationProgressProps {
  startTime: number;
  apiStartTime?: number | null; // When the API call actually started
  isComplete: boolean;
  completedAt?: number;
  className?: string;
  estimatedTimeSeconds?: number | null;
  onViewHistory?: () => void;
}

export const GenerationProgress = ({ 
  startTime, 
  apiStartTime,
  isComplete, 
  completedAt,
  className,
  estimatedTimeSeconds,
  onViewHistory
}: GenerationProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [setupTime, setSetupTime] = useState<number | null>(null);
  const [apiTime, setApiTime] = useState<number | null>(null);
  // Track effective API start time as state so it can be updated dynamically
  const [effectiveApiStart, setEffectiveApiStart] = useState<number | null>(apiStartTime || null);

  // Update effective API start when prop changes
  useEffect(() => {
    if (apiStartTime) {
      setEffectiveApiStart(apiStartTime);
    }
  }, [apiStartTime]);

  // Determine if we're still in setup phase (before API call or fallback kicks in)
  const isSettingUp = !effectiveApiStart && !isComplete;

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      if (completedAt) {
        const totalElapsed = (completedAt - startTime) / 1000;
        setElapsedTime(totalElapsed);
        
        // Calculate timing breakdown
        if (effectiveApiStart) {
          const setupDuration = (effectiveApiStart - startTime) / 1000;
          const apiDuration = (completedAt - effectiveApiStart) / 1000;
          setSetupTime(setupDuration);
          setApiTime(apiDuration);
        }
      }
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const totalElapsed = now - startTime;
      const elapsedSeconds = totalElapsed / 1000;
      const setupElapsed = now - startTime;
      
      // Check if we should trigger the 12s fallback (recalculated every tick)
      const shouldFallback = setupElapsed > MAX_SETUP_TIME_MS && !effectiveApiStart;
      
      // If fallback should trigger, update the effective API start time
      if (shouldFallback) {
        setEffectiveApiStart(startTime + MAX_SETUP_TIME_MS);
      }
      
      // Determine current effective start time for this tick
      const currentEffectiveStart = effectiveApiStart || (shouldFallback ? startTime + MAX_SETUP_TIME_MS : null);
      
      if (!currentEffectiveStart) {
        // Still in setup phase - just show elapsed time, no progress bar
        setElapsedTime(elapsedSeconds);
        setProgress(0);
      } else {
        // API call in progress (either from prop or fallback)
        const apiElapsed = now - currentEffectiveStart;
        const apiSeconds = apiElapsed / 1000;
        const setupDuration = (currentEffectiveStart - startTime) / 1000;
        setSetupTime(setupDuration);
        
        // Calculate target time with minimum of 60 seconds
        const targetTime = Math.max(estimatedTimeSeconds || 60, 60);
        
        // Linear progression from 0% to 90% over targetTime seconds
        if (apiSeconds <= targetTime) {
          setProgress(Math.floor((apiSeconds / targetTime) * 90));
        } else {
          // Stay at 90% after targetTime seconds
          setProgress(90);
        }
        
        setElapsedTime(elapsedSeconds);
      }
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [startTime, effectiveApiStart, isComplete, completedAt, estimatedTimeSeconds]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : isSettingUp ? (
            <Settings2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          <span className="text-sm font-medium">
            {isComplete 
              ? "Generation Complete" 
              : isSettingUp 
                ? "Setting up..." 
                : "Generating..."}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="tabular-nums min-w-[3.5rem] text-right">{elapsedTime.toFixed(1)}s</span>
          </div>
          {!isComplete && onViewHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewHistory}
              className="h-7 px-2 ml-2"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              My Creations
            </Button>
          )}
        </div>
      </div>
      
      {/* Only show progress bar after setup phase */}
      {!isSettingUp && (
        <Progress value={progress} className="h-2" />
      )}
      
      {/* Show setup indicator during setup phase */}
      {isSettingUp && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-muted via-muted-foreground/20 to-muted animate-pulse" />
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {isSettingUp ? (
          <span className="text-muted-foreground">Preparing your generation...</span>
        ) : (
          <span>{progress}%</span>
        )}
        {isComplete && (
          <span className="text-green-600 dark:text-green-400 font-medium">
            ✓ Generated in {elapsedTime.toFixed(1)}s
            {setupTime !== null && apiTime !== null && (
              <span className="text-muted-foreground font-normal ml-1">
                (setup: {setupTime.toFixed(1)}s, API: {apiTime.toFixed(1)}s)
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
};
