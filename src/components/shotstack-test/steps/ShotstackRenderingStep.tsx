import { Progress } from '@/components/ui/progress';
import { Loader2, Video, Clock } from 'lucide-react';

interface ShotstackRenderingStepProps {
  progress: number;
  elapsedTime: string;
  isRendering: boolean;
}

export function ShotstackRenderingStep({
  progress,
  elapsedTime,
  isRendering,
}: ShotstackRenderingStepProps) {
  if (!isRendering) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Waiting for render submission...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Animated Header */}
      <div className="flex items-center justify-center gap-3">
        <div className="relative">
          <Video className="h-10 w-10 text-primary" />
          <Loader2 className="h-4 w-4 text-primary animate-spin absolute -bottom-1 -right-1" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-foreground">Rendering Video</h3>
          <p className="text-sm text-muted-foreground">Shotstack is processing your video...</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress}% complete</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {elapsedTime}
          </span>
        </div>
      </div>

      {/* Status Messages */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>Processing video frames...</span>
        </div>
        {progress > 30 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Applying overlays...</span>
          </div>
        )}
        {progress > 60 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Encoding output...</span>
          </div>
        )}
        {progress > 90 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Finalizing...</span>
          </div>
        )}
      </div>

      {/* Tip */}
      <p className="text-xs text-center text-muted-foreground">
        💡 Tip: Video rendering typically takes 30-60 seconds
      </p>
    </div>
  );
}
