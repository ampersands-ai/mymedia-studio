import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useFlowTracking } from "@/hooks/admin/model-health/useFlowTracking";
import type { ModelHealthSummary } from "@/types/admin/model-health";
import { formatDistanceToNow } from "date-fns";

interface FlowTrackingDialogProps {
  model: ModelHealthSummary | null;
  testResultId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FlowTrackingDialog = ({
  model,
  testResultId,
  open,
  onOpenChange,
}: FlowTrackingDialogProps) => {
  const { data: testResult } = useFlowTracking(testResultId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "completed":
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "running":
        return "default";
      case "completed":
      case "success":
        return "default";
      case "failed":
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Progress: {model?.model_name}</DialogTitle>
          <DialogDescription>
            Real-time tracking of model health test execution
          </DialogDescription>
        </DialogHeader>

        {testResult && (
          <div className="space-y-4">
            {/* Overall Status */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResult.status)}
                  <span className="font-medium">Status:</span>
                  <Badge variant={getStatusVariant(testResult.status)}>
                    {testResult.status}
                  </Badge>
                </div>
                {testResult.created_at && (
                  <span className="text-sm text-muted-foreground">
                    Started {formatDistanceToNow(new Date(testResult.created_at), { addSuffix: true })}
                  </span>
                )}
              </div>

              {testResult.total_latency_ms && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Latency: {(testResult.total_latency_ms / 1000).toFixed(2)}s
                </div>
              )}

              {testResult.error_message && (
                <div className="mt-2 p-2 bg-destructive/10 rounded-md">
                  <p className="text-sm text-destructive font-medium">Error:</p>
                  <p className="text-sm text-destructive">{testResult.error_message}</p>
                </div>
              )}
            </Card>

            {/* Flow Steps */}
            {testResult.flow_steps && testResult.flow_steps.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Execution Flow</h3>
                <div className="space-y-2">
                  {testResult.flow_steps.map((step, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getStatusIcon(step.status || "pending")}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              Step {step.step_number}: {step.step_name}
                            </span>
                            {step.duration_ms && (
                              <span className="text-xs text-muted-foreground">
                                {(step.duration_ms / 1000).toFixed(2)}s
                              </span>
                            )}
                          </div>
                          {step.data && Object.keys(step.data).length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {JSON.stringify(step.data, null, 2)}
                            </p>
                          )}
                          {step.error && (
                            <p className="text-xs text-destructive">
                              Error: {step.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Output URL */}
            {testResult.output_url && (
              <Card className="p-4">
                <h3 className="font-medium mb-2">Generated Output</h3>
                <a
                  href={testResult.output_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {testResult.output_url}
                </a>
              </Card>
            )}
          </div>
        )}

        {!testResult && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
