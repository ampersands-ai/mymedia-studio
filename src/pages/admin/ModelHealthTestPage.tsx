import { useState, useEffect } from "react";
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
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Download, PlayCircle, Circle } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function ModelHealthTestPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { data: models, isLoading: modelsLoading } = useModelHealth();
  const { testModel } = useModelTesting();
  const [testResultId, setTestResultId] = useState<string | null>(null);
  const { data: testResult, isLoading: testLoading } = useFlowTracking(testResultId);
  const [isStarting, setIsStarting] = useState(false);

  const model = models?.find(m => m.record_id === recordId);

  const getDefaultPrompt = () => {
    if (!model) return "";
    switch (model.content_type) {
      case "image":
        return "Generate a beautiful sunset over mountains with vibrant colors";
      case "video":
        return "Create a smooth 5-second video of ocean waves";
      case "audio":
        return "Generate a calm ambient background music track";
      case "text":
        return "Write a creative short story about space exploration";
      default:
        return "Test prompt for " + model.content_type;
    }
  };

  const [testConfig, setTestConfig] = useState({
    prompt: "",
    customParams: ""
  });

  // Set default prompt when model loads
  useEffect(() => {
    if (model && !testConfig.prompt) {
      setTestConfig(prev => ({ ...prev, prompt: getDefaultPrompt() }));
    }
  }, [model]);

  useFlowStepNotifications(
    testResult?.flow_steps || [],
    model?.model_name || 'Model',
    !!testResult
  );

  const handleStartTest = async () => {
    if (!recordId) return;
    
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
            <h1 className="text-3xl font-bold">Test: {model.model_name}</h1>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">{model.provider}</Badge>
              <Badge variant="outline">{model.content_type}</Badge>
              <Badge variant={model.is_active ? "default" : "secondary"}>
                {model.is_active ? "Active" : "Inactive"}
              </Badge>
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

      {!testResultId ? (
        <Card>
          <CardHeader>
            <CardTitle>Configure Test</CardTitle>
            <CardDescription>
              Customize the test parameters before running the test on {model.model_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prompt">Test Prompt</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTestConfig({ ...testConfig, prompt: getDefaultPrompt() })}
                    >
                      Reset to Default
                    </Button>
                  </div>
                  <Textarea
                    id="prompt"
                    placeholder="Enter a test prompt..."
                    value={testConfig.prompt}
                    onChange={(e) => setTestConfig({ ...testConfig, prompt: e.target.value })}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pre-filled with a default prompt for {model.content_type} models
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customParams">Custom Parameters (Optional JSON)</Label>
                  <Textarea
                    id="customParams"
                    placeholder='{"temperature": 0.7, "max_tokens": 1000}'
                    value={testConfig.customParams}
                    onChange={(e) => setTestConfig({ ...testConfig, customParams: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="p-4 rounded-lg border bg-muted/50">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Test Execution Flow Preview
                  </h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {[
                      '1. User Input Validation',
                      '2. Credit Check',
                      '3. Credit Deduction',
                      '4. API Request Prepared',
                      '5. API Request Sent',
                      '6. First Response Received',
                      '7. Polling for Completion',
                      '8. Final Response Received',
                      '9. Media Stored on Backend'
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <Circle className="w-3 h-3 flex-shrink-0 opacity-40" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    These steps will execute when you run the test
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/50">
                  <h3 className="font-semibold mb-3">Model Details</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Provider:</dt>
                      <dd className="font-medium">{model.provider}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Content Type:</dt>
                      <dd className="font-medium">{model.content_type}</dd>
                    </div>
                    {model.groups && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Group:</dt>
                        <dd className="font-medium">{model.groups}</dd>
                      </div>
                    )}
                    {model.timeout_seconds && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Timeout:</dt>
                        <dd className="font-medium">{model.timeout_seconds}s</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {model.last_test_at && (
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <h3 className="font-semibold mb-3">Last Test Results</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Success Rate:</dt>
                        <dd className="font-medium">{model.success_rate_percent_24h?.toFixed(1)}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Avg Latency:</dt>
                        <dd className="font-medium">{model.avg_latency_ms ? (model.avg_latency_ms / 1000).toFixed(2) + 's' : '—'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Tests (24h):</dt>
                        <dd className="font-medium">{model.successful_tests_24h}/{model.total_tests_24h}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => navigate('/admin/model-health')}>
                Cancel
              </Button>
              <Button 
                onClick={handleStartTest} 
                disabled={isStarting || !model.is_active}
                size="lg"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Test...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Run Test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (isStarting || testLoading) && !testResult ? (
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
            <div className="space-y-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                Test Failed
              </h2>
              <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-destructive">Error Details</div>
                    <div className="text-sm text-destructive/90 mt-1 font-mono">
                      {testResult.error_message}
                    </div>
                    {testResult.error_code && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Error Code: {testResult.error_code}
                      </div>
                    )}
                    {testResult.error_stack && (
                      <details className="mt-3">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View Stack Trace
                        </summary>
                        <pre className="text-xs mt-2 p-2 bg-background/50 rounded overflow-x-auto">
                          {testResult.error_stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {testResult.flow_steps && testResult.flow_steps.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Execution Flow</h2>
              <div className="rounded-lg border bg-card/50 p-6">
                <TestFlowTimeline 
                  flowSteps={testResult.flow_steps} 
                  status={testResult.status}
                />
              </div>
            </div>
          )}

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
