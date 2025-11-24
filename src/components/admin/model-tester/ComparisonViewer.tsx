import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  GitCompare,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from "lucide-react";
import type { ExecutionFlow, ExecutionStep } from "@/lib/admin/enhancedExecutionTracker";
import { cn } from "@/lib/utils";

interface ComparisonViewerProps {
  runs: ExecutionFlow[];
  onClose?: () => void;
}

interface StepComparison {
  stepName: string;
  runs: {
    status?: string;
    duration?: number;
    outputs?: any;
    error?: string;
  }[];
  hasDifference: boolean;
}

export function ComparisonViewer({ runs, onClose }: ComparisonViewerProps) {
  const [selectedTab, setSelectedTab] = useState<"overview" | "steps" | "performance">(
    "overview"
  );

  if (runs.length < 2) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Please select at least 2 test runs to compare
        </p>
      </Card>
    );
  }

  // Build step comparisons
  const stepComparisons = buildStepComparisons(runs);

  // Calculate summary metrics
  const summary = {
    totalRuns: runs.length,
    completedRuns: runs.filter((r) => r.status === "completed").length,
    failedRuns: runs.filter((r) => r.status === "failed").length,
    averageDuration:
      runs.reduce((sum, r) => sum + (r.duration || 0), 0) / runs.length,
    stepsDifferent: stepComparisons.filter((s) => s.hasDifference).length,
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  // Get duration change indicator
  const getDurationChange = (current: number, baseline: number) => {
    if (!baseline || !current) return null;
    const change = ((current - baseline) / baseline) * 100;
    if (Math.abs(change) < 5) return null; // Ignore < 5% changes
    return {
      percentage: change,
      icon:
        change > 0 ? (
          <TrendingUp className="h-3 w-3 text-red-600" />
        ) : (
          <TrendingDown className="h-3 w-3 text-green-600" />
        ),
      color: change > 0 ? "text-red-600" : "text-green-600",
    };
  };

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Comparison View</span>
          <Badge variant="secondary" className="text-xs">
            {runs.length} runs
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
        <div className="border-b px-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="steps">
              Step Comparison
              {summary.stepsDifferent > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {summary.stepsDifferent}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1" style={{ maxHeight: "600px" }}>
          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Total Runs</p>
                <p className="text-2xl font-bold">{summary.totalRuns}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.completedRuns}
                </p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Failed</p>
                <p className="text-2xl font-bold text-red-600">{summary.failedRuns}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Avg Duration</p>
                <p className="text-2xl font-bold">
                  {formatDuration(summary.averageDuration)}
                </p>
              </Card>
            </div>

            {/* Run Details */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Run Details</h3>
              <div className="space-y-3">
                {runs.map((run, index) => (
                  <div key={run.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{run.modelName}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            run.status === "completed" &&
                              "bg-green-100 text-green-800 border-green-300",
                            run.status === "failed" &&
                              "bg-red-100 text-red-800 border-red-300"
                          )}
                        >
                          {run.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Duration: {formatDuration(run.duration || 0)}
                        </span>
                        <span>
                          Steps:{" "}
                          {run.steps.filter((s) => s.stepType === "main" && s.status === "completed").length}{" "}
                          / {run.steps.filter((s) => s.stepType === "main").length}
                        </span>
                        <span>
                          Created:{" "}
                          {run.startedAt
                            ? new Date(run.startedAt).toLocaleString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Differences Summary */}
            {summary.stepsDifferent > 0 && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                      {summary.stepsDifferent} Step{summary.stepsDifferent > 1 ? "s" : ""} Have
                      Differences
                    </h4>
                    <p className="text-sm text-yellow-800">
                      Switch to the "Step Comparison" tab to see detailed differences.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Step Comparison Tab */}
          <TabsContent value="steps" className="p-4 space-y-3">
            {stepComparisons.map((comparison, index) => (
              <Card
                key={index}
                className={cn(
                  "p-3",
                  comparison.hasDifference && "border-yellow-300 bg-yellow-50/50"
                )}
              >
                <div className="flex items-start gap-2 mb-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comparison.stepName}</span>
                      {comparison.hasDifference && (
                        <Badge variant="destructive" className="text-xs">
                          Different
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${runs.length}, 1fr)` }}>
                  {comparison.runs.map((stepRun, runIndex) => (
                    <div
                      key={runIndex}
                      className="p-2 bg-muted/30 rounded border border-muted"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">Run {runIndex + 1}</span>
                        {stepRun.status === "completed" ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : stepRun.status === "failed" ? (
                          <X className="h-3 w-3 text-red-600" />
                        ) : (
                          <Minus className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        {stepRun.duration !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <div className="flex items-center gap-1">
                              <span>{formatDuration(stepRun.duration)}</span>
                              {runIndex > 0 &&
                                comparison.runs[0].duration &&
                                getDurationChange(
                                  stepRun.duration,
                                  comparison.runs[0].duration
                                )?.icon}
                            </div>
                          </div>
                        )}
                        {stepRun.error && (
                          <div className="text-red-600 text-xs mt-1 p-1 bg-red-50 rounded">
                            {stepRun.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="p-4 space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Duration Comparison</h3>
              <div className="space-y-3">
                {runs.map((run, index) => {
                  const duration = run.duration || 0;
                  const maxDuration = Math.max(...runs.map((r) => r.duration || 0));
                  const percentage = maxDuration > 0 ? (duration / maxDuration) * 100 : 0;
                  const change =
                    index > 0 && runs[0].duration
                      ? getDurationChange(duration, runs[0].duration)
                      : null;

                  return (
                    <div key={run.id}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Run {index + 1}</span>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Baseline
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {change && (
                            <span className={cn("text-xs", change.color)}>
                              {change.percentage > 0 ? "+" : ""}
                              {change.percentage.toFixed(1)}%
                            </span>
                          )}
                          <span className="font-mono">{formatDuration(duration)}</span>
                        </div>
                      </div>
                      <div className="w-full h-6 bg-muted/30 rounded overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            index === 0 ? "bg-blue-600" : "bg-purple-600"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Step-by-Step Performance */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Step-by-Step Performance</h3>
              <div className="space-y-2">
                {stepComparisons.map((comparison, index) => {
                  const durations = comparison.runs.map((r) => r.duration || 0);
                  const hasDurationDiff = new Set(durations).size > 1;

                  if (!hasDurationDiff) return null;

                  return (
                    <div key={index} className="text-xs">
                      <p className="font-medium mb-1">{comparison.stepName}</p>
                      <div className="flex items-center gap-2">
                        {comparison.runs.map((stepRun, runIndex) => (
                          <div key={runIndex} className="flex-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>R{runIndex + 1}</span>
                              <span>{formatDuration(stepRun.duration || 0)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </Card>
  );
}

// Helper: Build step comparisons
function buildStepComparisons(runs: ExecutionFlow[]): StepComparison[] {
  // Get all unique step names across all runs
  const stepNamesSet = new Set<string>();
  runs.forEach((run) => {
    run.steps
      .filter((s) => s.stepType === "main")
      .forEach((step) => stepNamesSet.add(step.stepName));
  });

  const stepNames = Array.from(stepNamesSet);

  // Build comparisons
  return stepNames.map((stepName) => {
    const runsData = runs.map((run) => {
      const step = run.steps.find(
        (s) => s.stepType === "main" && s.stepName === stepName
      );
      return {
        status: step?.status,
        duration: step?.duration,
        outputs: step?.outputs,
        error: step?.error,
      };
    });

    // Check if there are differences
    const statuses = runsData.map((r) => r.status);
    const durations = runsData.map((r) => r.duration || 0);
    const errors = runsData.map((r) => r.error);

    const hasDifference =
      new Set(statuses).size > 1 ||
      new Set(errors.filter(Boolean)).size > 0 ||
      (durations.length > 1 &&
        Math.max(...durations) - Math.min(...durations) > 100); // >100ms difference

    return {
      stepName,
      runs: runsData,
      hasDifference,
    };
  });
}
