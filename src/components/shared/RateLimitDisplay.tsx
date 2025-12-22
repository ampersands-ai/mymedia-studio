import { useActiveGenerations } from "@/hooks/useActiveGenerations";
import { useConcurrentGenerationLimit } from "@/hooks/useConcurrentGenerationLimit";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RateLimitDisplayProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const RateLimitDisplay = ({ className, variant = 'compact' }: RateLimitDisplayProps) => {
  const { data: activeGenerations = [] } = useActiveGenerations();
  const { data: maxConcurrent = 1 } = useConcurrentGenerationLimit();

  const activeCount = activeGenerations.length;
  const percentage = Math.min((activeCount / maxConcurrent) * 100, 100);
  const isAtLimit = activeCount >= maxConcurrent;
  const isNearLimit = activeCount >= maxConcurrent * 0.8;

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm",
              isAtLimit 
                ? "border-destructive/50 bg-destructive/10 text-destructive" 
                : isNearLimit 
                  ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                  : "border-border bg-muted/50 text-muted-foreground",
              className
            )}>
              {isAtLimit ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span className="font-medium">
                {activeCount}/{maxConcurrent}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium">Concurrent Generations</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAtLimit 
                ? "You've reached your limit. Wait for current generations to complete."
                : `You can run up to ${maxConcurrent} generations at once.`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("space-y-2 p-4 rounded-lg border bg-card", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAtLimit ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <Zap className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-medium">Active Generations</span>
        </div>
        <span className={cn(
          "text-sm font-bold",
          isAtLimit ? "text-destructive" : isNearLimit ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"
        )}>
          {activeCount} / {maxConcurrent}
        </span>
      </div>
      
      <Progress 
        value={percentage} 
        className={cn(
          "h-2",
          isAtLimit && "[&>div]:bg-destructive",
          isNearLimit && !isAtLimit && "[&>div]:bg-yellow-500"
        )}
      />
      
      {isAtLimit && (
        <p className="text-xs text-destructive">
          Queue full. Waiting for a slot to free up...
        </p>
      )}
    </div>
  );
};