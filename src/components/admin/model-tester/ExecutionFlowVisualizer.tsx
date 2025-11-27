import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExecutionStepCard } from "./ExecutionStepCard";
import type { ExecutionFlow } from "@/lib/admin/executionTracker";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ExecutionFlowVisualizerProps {
  flow: ExecutionFlow;
  onEditStep?: (stepId: string, newInputs: Record<string, any>) => void;
  onRerunFromStep?: (stepId: string) => void;
}

export function ExecutionFlowVisualizer({
  flow,
  onEditStep,
  onRerunFromStep
}: ExecutionFlowVisualizerProps) {
  const getStatusIcon = () => {
    switch (flow.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (flow.status) {
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const duration = flow.endTime
    ? ((flow.endTime - flow.startTime) / 1000).toFixed(2)
    : ((Date.now() - flow.startTime) / 1000).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Flow Header */}
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{flow.modelName}</h3>
              <Badge variant="outline" className={getStatusColor()}>
                <div className="flex items-center gap-1">
                  {getStatusIcon()}
                  <span className="capitalize">{flow.status}</span>
                </div>
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-mono">{flow.modelRecordId}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{duration}s</span>
            </div>
            {flow.generationId && (
              <div className="text-xs">
                <span className="text-muted-foreground">Generation ID:</span>
                <span className="ml-1 font-mono">{flow.generationId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Flow Stats */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{flow.steps.length}</div>
            <div className="text-xs text-muted-foreground">Total Steps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {flow.steps.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {flow.steps.filter(s => s.status === 'running').length}
            </div>
            <div className="text-xs text-muted-foreground">Running</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {flow.steps.filter(s => s.status === 'failed').length}
            </div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>
      </Card>

      {/* Execution Steps */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground">
          Execution Timeline
        </h4>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {flow.steps.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Connection Line */}
                {index < flow.steps.length - 1 && (
                  <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-border z-0" />
                )}

                <ExecutionStepCard
                  step={step}
                  onEdit={onEditStep}
                  onRerun={onRerunFromStep}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
