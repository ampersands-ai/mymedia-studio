import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, X, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface GeneratingOutputConsoleProps {
  progress: number;
  statusMessage: string;
  elapsedTime: number; // milliseconds since renderingStartTime
  onCheckStatus: () => void;
  onCancelRender: () => void;
  isCanceling: boolean;
}

export const GeneratingOutputConsole = ({
  progress,
  statusMessage,
  elapsedTime,
  onCheckStatus,
  onCancelRender,
  isCanceling,
}: GeneratingOutputConsoleProps) => {
  // Format elapsed time as MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Determine progress bar color based on progress
  const getProgressColor = () => {
    if (progress <= 50) return 'bg-blue-500';
    if (progress <= 90) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className="p-6 space-y-6 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <h3 className="text-xl font-bold">🎬 Generating Your Video...</h3>
        </div>
        <div className="text-sm font-mono text-muted-foreground">
          {formatTime(elapsedTime)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-bold text-lg">{progress}%</span>
        </div>
        <div className="relative">
          <Progress value={progress} className="h-3" />
          <div
            className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className="p-4 rounded-lg bg-background/50 border border-border">
        <p className="text-sm text-muted-foreground">{statusMessage}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCheckStatus}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Check Status
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={isCanceling}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Render
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Video Rendering?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure? Your tokens will NOT be refunded as the job has already started.
                
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ The video may still complete on the server, but it won't be saved to your account.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Rendering</AlertDialogCancel>
              <AlertDialogAction
                onClick={onCancelRender}
                className="bg-destructive hover:bg-destructive/90"
              >
                Cancel Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Helpful tip */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        💡 Tip: Video rendering typically takes about 2x the video duration
      </div>
    </Card>
  );
};
