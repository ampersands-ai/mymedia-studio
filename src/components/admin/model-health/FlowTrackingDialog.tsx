import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Download } from "lucide-react";
import { useFlowTracking } from "@/hooks/admin/model-health/useFlowTracking";
import { useFlowStepNotifications } from "@/hooks/admin/model-health/useFlowStepNotifications";
import { format } from "date-fns";
import { TestFlowTimeline } from "./TestFlowTimeline";
import { MediaPreview } from "./MediaPreview";
import type { ModelHealthSummary } from "@/types/admin/model-health";

interface FlowTrackingDialogProps {
  model: ModelHealthSummary | null;
  testResultId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FlowTrackingDialog = ({ model, testResultId, open, onOpenChange }: FlowTrackingDialogProps) => {
  const { data: testResult, isLoading } = useFlowTracking(testResultId);
  
  // Enable toast notifications when dialog is open
  useFlowStepNotifications(
    testResult?.flow_steps || [],
    model?.model_name || 'Model',
    open
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'failed':
      case 'error':
      case 'timeout':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'running':
        return 'secondary';
      case 'failed':
      case 'error':
      case 'timeout':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const calculateProgress = () => {
    if (!testResult?.flow_steps) return 0;
    const completed = testResult.flow_steps.filter(s => s.status === 'completed').length;
    return (completed / testResult.flow_steps.length) * 100;
  };

  const downloadReport = () => {
    if (!testResult) return;
    const report = JSON.stringify(testResult, null, 2);
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${testResult.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Test Flow Tracking
              {model && <span className="text-muted-foreground font-normal">• {model.model_name}</span>}
            </DialogTitle>
            {testResult && (
              <Button variant="ghost" size="sm" onClick={downloadReport}>
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : testResult ? (
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* Status Header */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                {getStatusIcon(testResult.status)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {testResult.status === 'success' ? 'Test Completed' : 
                       testResult.status === 'running' ? 'Test Running' : 
                       'Test Failed'}
                    </span>
                    <Badge variant={getStatusVariant(testResult.status)}>
                      {testResult.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Started {format(new Date(testResult.test_started_at), 'MMM d, yyyy HH:mm:ss')}
                    {testResult.test_completed_at && (
                      <> • Completed in {testResult.total_latency_ms}ms</>
                    )}
                  </div>
                </div>
              </div>
              
              {testResult.credits_required && (
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {testResult.credits_required} credits
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {testResult.credits_deducted && 'Deducted'}
                    {testResult.credits_refunded && ' (Refunded)'}
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {testResult.status === 'running' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(calculateProgress())}%</span>
                </div>
                <Progress value={calculateProgress()} className="h-2" />
              </div>
            )}

            {/* Error Message */}
            {testResult.error_message && (
              <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-destructive">Error</div>
                    <div className="text-sm text-destructive/90 mt-1">
                      {testResult.error_message}
                    </div>
                    {testResult.error_code && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Code: {testResult.error_code}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Flow Timeline */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Execution Flow</h3>
              <div className="rounded-lg border bg-card p-4">
                <TestFlowTimeline 
                  flowSteps={testResult.flow_steps} 
                  status={testResult.status}
                />
              </div>
            </div>

            {/* Output Preview */}
            {testResult.output_url && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Generated Output</h3>
                <MediaPreview 
                  url={testResult.output_url}
                  previewUrl={testResult.media_preview_url}
                />
              </div>
            )}

            {/* Technical Details */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Technical Details</h3>
              <div className="grid grid-cols-2 gap-3 p-4 rounded-lg border bg-card text-sm">
                <div>
                  <div className="text-muted-foreground">Test ID</div>
                  <div className="font-mono text-xs mt-1">{testResult.id}</div>
                </div>
                {testResult.generation_id && (
                  <div>
                    <div className="text-muted-foreground">Generation ID</div>
                    <div className="font-mono text-xs mt-1">{testResult.generation_id}</div>
                  </div>
                )}
                {testResult.credit_check_ms && (
                  <div>
                    <div className="text-muted-foreground">Credit Check</div>
                    <div className="font-mono mt-1">{testResult.credit_check_ms}ms</div>
                  </div>
                )}
                {testResult.generation_submit_ms && (
                  <div>
                    <div className="text-muted-foreground">Submit Time</div>
                    <div className="font-mono mt-1">{testResult.generation_submit_ms}ms</div>
                  </div>
                )}
                {testResult.polling_duration_ms && (
                  <div>
                    <div className="text-muted-foreground">Polling Duration</div>
                    <div className="font-mono mt-1">{testResult.polling_duration_ms}ms</div>
                  </div>
                )}
                {testResult.storage_save_ms && (
                  <div>
                    <div className="text-muted-foreground">Storage Save</div>
                    <div className="font-mono mt-1">{testResult.storage_save_ms}ms</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No test data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
