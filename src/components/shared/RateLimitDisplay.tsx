import { useActiveGenerations } from "@/hooks/useActiveGenerations";
import { useConcurrentGenerationLimit } from "@/hooks/useConcurrentGenerationLimit";
import { useGenerationCooldown } from "@/hooks/useGenerationCooldown";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, AlertTriangle, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface RateLimitDisplayProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const RateLimitDisplay = ({ className, variant = 'compact' }: RateLimitDisplayProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: activeGenerations = [] } = useActiveGenerations();
  const { data: maxConcurrent = 1 } = useConcurrentGenerationLimit();
  const { isOnCooldown, remainingSeconds, cooldownDuration } = useGenerationCooldown();

  // Count ONLY truly active generations (pending/processing), de-duped by root
  const activeCount = new Set(
    activeGenerations
      .filter(g => g.status === 'pending' || g.status === 'processing')
      .map(g => (g.parent_generation_id ?? g.id))
  ).size;

  const percentage = Math.min((activeCount / maxConcurrent) * 100, 100);
  const isAtLimit = activeCount >= maxConcurrent;
  const isNearLimit = activeCount >= maxConcurrent * 0.8;
  const cooldownPercentage = isOnCooldown ? ((cooldownDuration - remainingSeconds) / cooldownDuration) * 100 : 100;

  // Manual refresh handler - click counter to force sync
  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["active-generations", user?.id] });
  };

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-2", className)}>
          {/* Cooldown indicator */}
          {isOnCooldown && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm">
                  <Timer className="h-3.5 w-3.5" />
                  <span className="font-medium tabular-nums">{remainingSeconds}s</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">Cooldown Active</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please wait {remainingSeconds} seconds before your next generation.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Concurrent generations indicator - clickable to refresh */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleManualRefresh}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors hover:bg-muted/80",
                  isAtLimit 
                    ? "border-destructive/50 bg-destructive/10 text-destructive" 
                    : isNearLimit 
                      ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                      : "border-border bg-muted/50 text-muted-foreground",
                )}
              >
                {isAtLimit ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {activeCount}/{maxConcurrent}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">Concurrent Generations</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAtLimit 
                  ? "You've reached your limit. Wait for current generations to complete."
                  : `You can run up to ${maxConcurrent} generations at once.`}
              </p>
              <p className="text-xs text-muted-foreground mt-1 italic">Tap to refresh</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("space-y-3 p-4 rounded-lg border bg-card", className)}>
      {/* Cooldown progress */}
      {isOnCooldown && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Cooldown</span>
            </div>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums">
              {remainingSeconds}s
            </span>
          </div>
          <Progress 
            value={cooldownPercentage} 
            className="h-2 [&>div]:bg-orange-500"
          />
        </div>
      )}

      {/* Concurrent generations */}
      <div className="space-y-2">
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
    </div>
  );
};