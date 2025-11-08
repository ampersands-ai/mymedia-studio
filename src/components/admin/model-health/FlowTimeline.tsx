import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import type { FlowStep } from "@/types/admin/model-health";

interface FlowTimelineProps {
  steps: FlowStep[];
  totalLatency?: number | null;
}

const STEP_ICONS = {
  completed: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  pending: Clock,
};

const STEP_COLORS = {
  completed: "text-success",
  failed: "text-destructive",
  running: "text-primary",
  pending: "text-muted-foreground",
};

export const FlowTimeline = ({ steps, totalLatency }: FlowTimelineProps) => {
  if (!steps || steps.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">No flow data available</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Flow Timeline</h3>
          {totalLatency && (
            <Badge variant="outline">
              Total: {(totalLatency / 1000).toFixed(2)}s
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.status];
            const isLast = index === steps.length - 1;

            return (
              <div key={step.step_number} className="relative">
                {/* Connector line */}
                {!isLast && (
                  <div
                    className="absolute left-[11px] top-6 w-0.5 h-6 bg-border"
                    aria-hidden="true"
                  />
                )}

                {/* Step content */}
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 ${STEP_COLORS[step.status]}`}>
                    <Icon
                      className={`h-6 w-6 ${
                        step.status === "running" ? "animate-spin" : ""
                      }`}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {step.step_number}. {step.step_name}
                        </p>
                        {step.error && (
                          <p className="text-xs text-destructive mt-1">
                            {step.error}
                          </p>
                        )}
                        {step.data && Object.keys(step.data).length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {Object.entries(step.data)
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <div key={key} className="truncate">
                                  <span className="font-medium">{key}:</span>{" "}
                                  {String(value)}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      {step.duration_ms !== null && (
                        <Badge variant="secondary" className="text-xs">
                          {(step.duration_ms / 1000).toFixed(2)}s
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
