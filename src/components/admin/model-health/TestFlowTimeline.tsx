import { FlowStep } from "@/types/admin/model-health";
import { CheckCircle2, Circle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlowStepTooltip } from "./FlowStepTooltip";

interface TestFlowTimelineProps {
  flowSteps: FlowStep[];
  status: 'running' | 'success' | 'failed' | 'timeout' | 'error';
}

export const TestFlowTimeline = ({ flowSteps, status }: TestFlowTimelineProps) => {
  const getStepIcon = (step: FlowStep) => {
    if (step.status === 'completed') {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    if (step.status === 'failed') {
      return <XCircle className="w-5 h-5 text-destructive" />;
    }
    if (step.status === 'running') {
      return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    }
    return <Circle className="w-5 h-5 text-muted-foreground/40" />;
  };

  const getStepColor = (step: FlowStep) => {
    if (step.status === 'completed') return 'text-foreground';
    if (step.status === 'failed') return 'text-destructive';
    if (step.status === 'running') return 'text-primary font-medium';
    return 'text-muted-foreground';
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-1">
      {flowSteps.map((step, index) => (
        <FlowStepTooltip key={step.step_number} step={step}>
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group">
            <div className="relative flex-shrink-0">
              {getStepIcon(step)}
              {index < flowSteps.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-1/2 top-6 w-0.5 h-6 -translate-x-1/2",
                    step.status === 'completed' ? 'bg-green-500/30' : 'bg-border'
                  )}
                />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className={cn("text-sm", getStepColor(step))}>
                {step.step_name}
                {step.status === 'running' && step.progress_percent && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({step.progress_percent}%)
                  </span>
                )}
              </div>
              {step.error && (
                <div className="text-xs text-destructive mt-0.5 truncate">
                  {step.error}
                </div>
              )}
            </div>

            <div className={cn(
              "text-xs font-mono flex-shrink-0",
              step.status === 'completed' ? 'text-muted-foreground' : 'text-muted-foreground/50'
            )}>
              {formatDuration(step.duration_ms)}
            </div>
          </div>
        </FlowStepTooltip>
      ))}
    </div>
  );
};
