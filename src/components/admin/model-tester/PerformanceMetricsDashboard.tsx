import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import type { ExecutionFlow, ExecutionStep } from "@/lib/admin/enhancedExecutionTracker";
import { cn } from "@/lib/utils";

interface PerformanceMetricsDashboardProps {
  flow: ExecutionFlow;
  compareWith?: ExecutionFlow; // Optional comparison run
}

interface StepMetrics {
  stepName: string;
  duration: number;
  percentage: number;
  isBottleneck: boolean;
}

export function PerformanceMetricsDashboard({
  flow,
  compareWith,
}: PerformanceMetricsDashboardProps) {
  // Calculate metrics
  const mainSteps = flow.steps.filter((s) => s.stepType === "main");
  const completedSteps = mainSteps.filter((s) => s.status === "completed");
  const totalDuration = flow.duration || 0;

  // Calculate step metrics
  const stepMetrics: StepMetrics[] = completedSteps.map((step) => {
    const duration = step.duration || 0;
    const percentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
    // Mark as bottleneck if takes > 25% of total time
    const isBottleneck = percentage > 25;

    return {
      stepName: step.stepName,
      duration,
      percentage,
      isBottleneck,
    };
  });

  // Sort by duration (descending)
  const sortedMetrics = [...stepMetrics].sort((a, b) => b.duration - a.duration);

  // Calculate comparison metrics if compareWith is provided
  const comparisonMetrics = compareWith
    ? calculateComparison(flow, compareWith)
    : null;

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  // Get performance rating
  const getPerformanceRating = () => {
    if (totalDuration < 1000) return { label: "Excellent", color: "text-green-600" };
    if (totalDuration < 3000) return { label: "Good", color: "text-blue-600" };
    if (totalDuration < 5000) return { label: "Average", color: "text-yellow-600" };
    return { label: "Slow", color: "text-red-600" };
  };

  const rating = getPerformanceRating();

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total Duration */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Duration</span>
          </div>
          <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
          <div className={cn("text-xs mt-1", rating.color)}>{rating.label}</div>
        </Card>

        {/* Steps Completed */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Steps Completed</span>
          </div>
          <div className="text-2xl font-bold">
            {completedSteps.length} / {mainSteps.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {((completedSteps.length / mainSteps.length) * 100).toFixed(0)}% complete
          </div>
        </Card>

        {/* Average Step Time */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Avg Step Time</span>
          </div>
          <div className="text-2xl font-bold">
            {formatDuration(
              completedSteps.length > 0
                ? totalDuration / completedSteps.length
                : 0
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Per step</div>
        </Card>

        {/* Bottlenecks */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Bottlenecks</span>
          </div>
          <div className="text-2xl font-bold">
            {sortedMetrics.filter((m) => m.isBottleneck).length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {sortedMetrics.filter((m) => m.isBottleneck).length > 0
              ? "Needs optimization"
              : "Well balanced"}
          </div>
        </Card>
      </div>

      {/* Comparison Metrics */}
      {comparisonMetrics && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Performance Comparison</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duration Change</p>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-lg font-semibold",
                    comparisonMetrics.durationChange > 0
                      ? "text-red-600"
                      : "text-green-600"
                  )}
                >
                  {comparisonMetrics.durationChange > 0 ? "+" : ""}
                  {comparisonMetrics.durationChange.toFixed(0)}%
                </span>
                {comparisonMetrics.durationChange > 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Steps Change</p>
              <span className="text-lg font-semibold">
                {comparisonMetrics.stepsChange > 0 ? "+" : ""}
                {comparisonMetrics.stepsChange}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Success Rate</p>
              <span className="text-lg font-semibold">
                {comparisonMetrics.successRate.toFixed(0)}%
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Step-by-Step Breakdown */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Step-by-Step Performance</span>
        </div>
        <Separator className="mb-4" />
        <div className="space-y-3">
          {sortedMetrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <span className="font-medium">{metric.stepName}</span>
                  {metric.isBottleneck && (
                    <Badge variant="destructive" className="text-xs">
                      Bottleneck
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {metric.percentage.toFixed(1)}%
                  </span>
                  <span className="font-mono">{formatDuration(metric.duration)}</span>
                </div>
              </div>
              <div className="relative">
                <Progress
                  value={metric.percentage}
                  className={cn(
                    "h-2",
                    metric.isBottleneck && "bg-red-100"
                  )}
                />
                <div 
                  className={cn(
                    "absolute top-0 left-0 h-full rounded-full transition-all",
                    metric.isBottleneck ? "bg-red-600" : "bg-blue-600"
                  )}
                  style={{ width: `${metric.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Timeline Visualization */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Execution Timeline</span>
        </div>
        <Separator className="mb-4" />
        <div className="relative h-20 bg-muted/30 rounded overflow-hidden">
          {/* Timeline bars */}
          {completedSteps.map((step, index) => {
            const startOffset =
              index > 0
                ? completedSteps
                    .slice(0, index)
                    .reduce((acc, s) => acc + (s.duration || 0), 0)
                : 0;
            const startPercentage = (startOffset / totalDuration) * 100;
            const widthPercentage = ((step.duration || 0) / totalDuration) * 100;

            return (
              <div
                key={step.id}
                className={cn(
                  "absolute top-0 h-full border-r border-white/20 hover:opacity-80 transition-opacity cursor-pointer group"
                )}
                style={{
                  left: `${startPercentage}%`,
                  width: `${widthPercentage}%`,
                  backgroundColor: getStepColor(index),
                }}
                title={`${step.stepName}: ${formatDuration(step.duration || 0)}`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {step.stepName}: {formatDuration(step.duration || 0)}
                </div>
              </div>
            );
          })}
        </div>
        {/* Timeline labels */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>0ms</span>
          <span>{formatDuration(totalDuration / 2)}</span>
          <span>{formatDuration(totalDuration)}</span>
        </div>
      </Card>

      {/* Recommendations */}
      {sortedMetrics.filter((m) => m.isBottleneck).length > 0 && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                Performance Recommendations
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                {sortedMetrics
                  .filter((m) => m.isBottleneck)
                  .map((metric, index) => (
                    <li key={index}>
                      • <strong>{metric.stepName}</strong> is taking{" "}
                      {metric.percentage.toFixed(0)}% of total execution time (
                      {formatDuration(metric.duration)}). Consider optimization.
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Helper: Calculate comparison metrics
function calculateComparison(current: ExecutionFlow, previous: ExecutionFlow) {
  const currentDuration = current.duration || 0;
  const previousDuration = previous.duration || 0;
  const durationChange =
    previousDuration > 0
      ? ((currentDuration - previousDuration) / previousDuration) * 100
      : 0;

  const currentSteps = current.steps.filter((s) => s.stepType === "main").length;
  const previousSteps = previous.steps.filter((s) => s.stepType === "main").length;
  const stepsChange = currentSteps - previousSteps;

  const currentCompleted = current.steps.filter(
    (s) => s.stepType === "main" && s.status === "completed"
  ).length;
  const successRate = currentSteps > 0 ? (currentCompleted / currentSteps) * 100 : 0;

  return {
    durationChange,
    stepsChange,
    successRate,
  };
}

// Helper: Get color for step based on index
function getStepColor(index: number): string {
  const colors = [
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#f59e0b", // amber
    "#10b981", // green
    "#06b6d4", // cyan
    "#6366f1", // indigo
    "#f97316", // orange
  ];
  return colors[index % colors.length];
}
