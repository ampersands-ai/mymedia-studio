import { useRef, useEffect, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepCollapsibleProps {
  stepNumber: number;
  title: string;
  subtitle?: string;
  isActive: boolean;
  isComplete: boolean;
  isDisabled?: boolean;
  summary?: React.ReactNode;
  children: React.ReactNode;
}

export function StepCollapsible({
  stepNumber,
  title,
  subtitle,
  isActive,
  isComplete,
  isDisabled = false,
  summary,
  children,
}: StepCollapsibleProps) {
  const stepRef = useRef<HTMLDivElement>(null);
  const [isManuallyOpen, setIsManuallyOpen] = useState(false);
  const prevIsActiveRef = useRef(isActive);

  // Open state: active steps are always open, completed steps can be toggled
  const isOpen = isActive || isManuallyOpen;

  // Reset manual open when step becomes active OR when step transitions from active to inactive (completes)
  useEffect(() => {
    const wasActive = prevIsActiveRef.current;
    prevIsActiveRef.current = isActive;
    
    // Reset when becoming active or when transitioning from active to inactive
    if (isActive || (wasActive && !isActive)) {
      setIsManuallyOpen(false);
    }
  }, [isActive]);

  // Smooth scroll to active step
  useEffect(() => {
    if (isActive && stepRef.current) {
      stepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [isActive]);

  const handleToggle = () => {
    // Only allow toggling on completed, non-active steps
    if (isComplete && !isActive) {
      setIsManuallyOpen(!isManuallyOpen);
    }
  };

  return (
    <div ref={stepRef}>
      <Collapsible
        open={isOpen}
        onOpenChange={handleToggle}
        className={cn(
          "border rounded-lg transition-all",
          isActive && "border-primary/50 bg-card shadow-sm",
          isComplete && !isActive && "border-primary/30 bg-primary/5",
          isDisabled && "opacity-50"
        )}
      >
        <CollapsibleTrigger
          className="w-full p-3 sm:p-4 flex items-center justify-between gap-3 min-h-[52px] sm:min-h-[56px] touch-manipulation"
          disabled={isDisabled || (!isActive && !isComplete)}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Badge
              variant={isComplete ? "default" : "outline"}
              className={cn(
                "w-7 h-7 flex items-center justify-center shrink-0 p-0",
                isActive && !isComplete && "border-primary text-primary"
              )}
            >
              {isComplete ? (
                <Check className="h-4 w-4" />
              ) : (
                stepNumber
              )}
            </Badge>
            <div className="min-w-0 text-left">
              <span className={cn(
                "font-bold text-sm sm:text-base block truncate",
                isActive && "text-primary"
              )}>
                {title}
              </span>
              {subtitle && !isOpen && (
                <span className="text-xs text-muted-foreground block truncate">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isComplete && summary && !isOpen && (
              <div className="hidden sm:block text-xs text-muted-foreground max-w-[200px] truncate">
                {summary}
              </div>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform text-muted-foreground",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-4 sm:px-4 sm:pb-5 pt-1 space-y-4">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
