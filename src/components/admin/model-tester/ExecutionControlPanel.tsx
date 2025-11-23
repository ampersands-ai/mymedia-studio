import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Pause,
  SkipForward,
  Square,
  RotateCcw,
  Download,
  Bookmark,
  Settings,
} from "lucide-react";
import type { ExecutionFlow, ExecutionMode } from "@/lib/admin/enhancedExecutionTracker";
import { cn } from "@/lib/utils";

interface ExecutionControlPanelProps {
  flow: ExecutionFlow;
  onPlay?: () => void;
  onPause?: () => void;
  onStepForward?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
  onExport?: () => void;
  onBookmark?: () => void;
  disabled?: boolean;
}

export function ExecutionControlPanel({
  flow,
  onPlay,
  onPause,
  onStepForward,
  onStop,
  onRestart,
  onExport,
  onBookmark,
  disabled = false,
}: ExecutionControlPanelProps) {
  const isRunning = flow.status === "running" && flow.mode === "auto";
  const isPaused = flow.mode === "paused";
  const isCompleted = flow.status === "completed";
  const isFailed = flow.status === "failed";

  const getModeLabel = (mode: ExecutionMode): string => {
    switch (mode) {
      case "auto":
        return "Auto";
      case "step":
        return "Step Mode";
      case "paused":
        return "Paused";
      default:
        return mode;
    }
  };

  const getStatusColor = () => {
    switch (flow.status) {
      case "running":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "failed":
        return "bg-red-100 text-red-800 border-red-300";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Status and Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor()}>
              <span className="capitalize">{flow.status}</span>
            </Badge>
            <Badge variant="secondary">
              {getModeLabel(flow.mode)}
            </Badge>
            {flow.testModeEnabled && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                Test Mode
              </Badge>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            Step {flow.currentStepIndex + 1} / {flow.steps.filter(s => s.stepType === "main").length}
          </div>
        </div>

        <Separator />

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Play/Resume */}
          <Button
            variant={isRunning ? "secondary" : "default"}
            onClick={onPlay}
            disabled={disabled || isRunning || isCompleted || isFailed}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {isPaused ? "Resume" : "Run All"}
          </Button>

          {/* Pause */}
          <Button
            variant="outline"
            onClick={onPause}
            disabled={disabled || !isRunning}
            className="w-full"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>

          {/* Step Forward */}
          <Button
            variant="outline"
            onClick={onStepForward}
            disabled={disabled || isRunning || isCompleted || isFailed}
            className="w-full"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Step Forward
          </Button>

          {/* Stop */}
          <Button
            variant="outline"
            onClick={onStop}
            disabled={disabled || (!isRunning && !isPaused)}
            className="w-full"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>

          {/* Restart */}
          <Button
            variant="outline"
            onClick={onRestart}
            disabled={disabled || isRunning}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>

          {/* Export */}
          <Button
            variant="outline"
            onClick={onExport}
            disabled={disabled || flow.steps.length === 0}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <Separator />

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBookmark}
            disabled={disabled || flow.steps.length === 0}
            className="w-full"
          >
            <Bookmark className={cn(
              "h-4 w-4 mr-2",
              flow.bookmarked && "fill-current text-yellow-500"
            )} />
            {flow.bookmarked ? "Bookmarked" : "Bookmark"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Progress Info */}
        {flow.status === "running" && (
          <div className="text-xs text-muted-foreground">
            {flow.pausedAtStep !== undefined && (
              <p>Paused at step {flow.pausedAtStep}</p>
            )}
            {flow.breakpoints.length > 0 && (
              <p>Breakpoints: {flow.breakpoints.join(", ")}</p>
            )}
          </div>
        )}

        {/* Test Mode Warning */}
        {flow.testModeEnabled && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-800">
              <strong>Test Mode Active:</strong> No credits will be deducted.
              This is a safe testing environment.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
