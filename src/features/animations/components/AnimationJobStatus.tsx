import { useEffect } from "react";
import { useAnimationJob } from "../hooks";
import type { AnimationStatus } from "../types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  jobId: string;
  onComplete?: (videoUrl: string) => void;
  onError?: (error: string) => void;
}

const statusConfig: Record<AnimationStatus, { icon: string; label: string; color: string }> = {
  queued: { icon: "⏳", label: "Waiting in queue...", color: "text-yellow-400" },
  analyzing: { icon: "🧠", label: "Analyzing script...", color: "text-blue-400" },
  building_config: { icon: "🔧", label: "Building config...", color: "text-blue-400" },
  pending_render: { icon: "📦", label: "Preparing render...", color: "text-purple-400" },
  rendering: { icon: "🎬", label: "Rendering...", color: "text-purple-400" },
  completed: { icon: "✅", label: "Complete!", color: "text-green-400" },
  failed: { icon: "❌", label: "Failed", color: "text-red-400" },
};

export function AnimationJobStatus({ jobId, onComplete, onError }: Props) {
  const { job, loading, error } = useAnimationJob(jobId);

  useEffect(() => {
    if (job?.status === "completed" && job.video_url && onComplete) {
      onComplete(job.video_url);
    }
    if (job?.status === "failed" && job.error_message && onError) {
      onError(job.error_message);
    }
  }, [job?.status, job?.video_url, job?.error_message, onComplete, onError]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>{error} - Job not found</span>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const status = statusConfig[job.status];

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{status.icon}</span>
        <div className="flex-1">
          <p className={cn("font-medium", status.color)}>
            {job.status === "rendering" && job.render_progress
              ? `${status.label} ${job.render_progress}%`
              : status.label}
          </p>
          {job.status === "rendering" && (
            <Progress value={job.render_progress || 0} className="mt-2 h-2" />
          )}
        </div>
      </div>

      {job.status === "failed" && job.error_message && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{job.error_message}</p>
        </div>
      )}

      {job.status === "completed" && job.video_url && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Video ready!</span>
          </div>
          <Button asChild className="w-full">
            <a href={job.video_url} download target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Download Video
            </a>
          </Button>
        </div>
      )}

      {job.llm_cost !== undefined && job.llm_cost > 0 && (
        <p className="text-xs text-muted-foreground">
          Estimated cost: ${(job.llm_cost + (job.render_cost || 0)).toFixed(4)}
        </p>
      )}
    </div>
  );
}
