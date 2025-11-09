import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useModelHealth } from "@/hooks/admin/model-health/useModelHealth";
import { useModelTesting } from "@/hooks/admin/model-health/useModelTesting";
import { useFlowTracking } from "@/hooks/admin/model-health/useFlowTracking";
import { useFlowStepNotifications } from "@/hooks/admin/model-health/useFlowStepNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TestFlowTimeline } from "@/components/admin/model-health/TestFlowTimeline";
import { MediaPreview } from "@/components/admin/model-health/MediaPreview";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Download } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function ModelHealthTestPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { data: models, isLoading: modelsLoading } = useModelHealth();
  const { testModel } = useModelTesting();
  const [testResultId, setTestResultId] = useState<string | null>(null);
  const { data: testResult, isLoading: testLoading } = useFlowTracking(testResultId);
  const [isStarting, setIsStarting] = useState(false);

  const model = models?.find(m => m.record_id === recordId);

  useFlowStepNotifications(
    testResult?.flow_steps || [],
    model?.model_name || 'Model',
    !!testResult
  );

  useEffect(() => {
    if (!recordId || !model || testResultId || isStarting) return;

    const startTest = async () => {
      setIsStarting(true);
      try {
        const result = await testModel.mutateAsync({ modelRecordId: recordId });
        if (result?.testResultId) {
          setTestResultId(result.testResultId);
        }
      } catch (error) {
        console.error("Failed to start test:", error);
      } finally {
        setIsStarting(false);
      }
    };

    startTest();
  }, [recordId, model, testResultId, isStarting]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'running':
        return <Loader2 className="w-6 h-6 animate-spin text-primary" />;
      case 'failed':
      case 'error':
      case 'timeout':
        return <XCircle className="w-6 h-6 text-destructive" />;
      default:
        return <Clock className="w-6 h-6 text-muted-foreground" />;
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

  if (modelsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Model not found</h2>
          <Button onClick={() => navigate('/admin/model-health')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Model Health
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/model-health')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Testing: {model.model_name}</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">{model.provider}</Badge>
              <Badge variant="outline">{model.content_type}</Badge>
            </div>
          </div>
        </div>
        {testResult && (
          <Button variant="outline" onClick={downloadReport}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        )}
      </div>

      {(isStarting || testLoading) && !testResult ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Starting test...</p>
        </div>
      ) : testResult ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
              {getStatusIcon(testResult.status)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold">
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
                <div className="text-lg font-medium">
                  {testResult.credits_required} credits
                </div>
                <div className="text-xs text-muted-foreground">
                  {testResult.credits_deducted && 'Deducted'}
                  {testResult.credits_refunded && ' (Refunded)'}
                </div>
              </div>
            )}
          </div>

          {testResult.status === 'running' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-3" />
            </div>
          )}

          {testResult.error_message && (
            <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
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

          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Execution Flow</h2>
            <div className="rounded-lg border bg-card/50 p-6">
              <TestFlowTimeline 
                flowSteps={testResult.flow_steps} 
                status={testResult.status}
              />
            </div>
          </div>

          {testResult.output_url && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Generated Output</h2>
              <MediaPreview 
                url={testResult.output_url}
                previewUrl={testResult.media_preview_url}
              />
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Technical Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6 rounded-lg border bg-card">
              <div>
                <div className="text-sm text-muted-foreground">Test ID</div>
                <div className="font-mono text-xs mt-1 break-all">{testResult.id}</div>
              </div>
              {testResult.generation_id && (
                <div>
                  <div className="text-sm text-muted-foreground">Generation ID</div>
                  <div className="font-mono text-xs mt-1 break-all">{testResult.generation_id}</div>
                </div>
              )}
              {testResult.credit_check_ms && (
                <div>
                  <div className="text-sm text-muted-foreground">Credit Check</div>
                  <div className="font-mono text-sm mt-1">{testResult.credit_check_ms}ms</div>
                </div>
              )}
              {testResult.generation_submit_ms && (
                <div>
                  <div className="text-sm text-muted-foreground">Submit Time</div>
                  <div className="font-mono text-sm mt-1">{testResult.generation_submit_ms}ms</div>
                </div>
              )}
              {testResult.polling_duration_ms && (
                <div>
                  <div className="text-sm text-muted-foreground">Polling Duration</div>
                  <div className="font-mono text-sm mt-1">{testResult.polling_duration_ms}ms</div>
                </div>
              )}
              {testResult.storage_save_ms && (
                <div>
                  <div className="text-sm text-muted-foreground">Storage Save</div>
                  <div className="font-mono text-sm mt-1">{testResult.storage_save_ms}ms</div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Failed to start test. Please try again.
        </div>
      )}
    </div>
  );
}
