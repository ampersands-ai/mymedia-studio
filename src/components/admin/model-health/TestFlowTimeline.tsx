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

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderStepDetails = (step: FlowStep) => {
    if (!step.data || Object.keys(step.data).length === 0) return null;

    return (
      <div className="ml-8 mt-2 space-y-1 text-xs">
        {Object.entries(step.data).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-muted-foreground min-w-[120px]">{key}:</span>
            <span className="text-foreground font-mono break-all">{formatValue(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {flowSteps.map((step, index) => (
        <div key={step.step_number} className="group">
          <div className="flex items-start gap-3 px-3 py-2 rounded-md hover:bg-accent/30 transition-colors">
            <div className="relative flex-shrink-0 pt-0.5">
              {getStepIcon(step)}
              {index < flowSteps.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-1/2 top-6 w-0.5 -translate-x-1/2",
                    step.status === 'completed' ? 'bg-green-500/20' : 'bg-border/50'
                  )}
                  style={{ height: 'calc(100% + 0.5rem)' }}
                />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className={cn("text-sm font-medium", getStepColor(step))}>
                  {step.step_number}. {step.step_name}
                </span>
                
                <span className={cn(
                  "text-xs font-mono tabular-nums flex-shrink-0",
                  step.status === 'completed' ? 'text-muted-foreground' : 'text-muted-foreground/40'
                )}>
                  {formatDuration(step.duration_ms)}
                </span>
              </div>
              
              {renderStepDetails(step)}

              {step.error && (
                <div className="ml-0 mt-2 text-xs text-destructive font-mono">
                  Error: {step.error}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
