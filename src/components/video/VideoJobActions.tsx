import { VideoJob } from '@/types/video';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Clock } from 'lucide-react';

interface VideoJobActionsProps {
  job: VideoJob;
  isStuckAssembling: boolean;
  isNearTimeout: boolean;
  timeoutCountdown: number | null;
  onRecoverJob: () => void;
  isRecoveringJob: boolean;
}

export function VideoJobActions({
  job,
  isStuckAssembling,
  isNearTimeout,
  timeoutCountdown,
  onRecoverJob,
  isRecoveringJob
}: VideoJobActionsProps) {
  const isProcessing = ['pending', 'generating_script', 'generating_voice', 'fetching_video', 'assembling'].includes(job.status);
  const showProcessingNote = isProcessing && !['generating_voice', 'fetching_video', 'assembling'].includes(job.status) && !isStuckAssembling && !isNearTimeout;

  if (job.status === 'failed') {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 md:p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm">
            <p className="font-medium text-destructive">Generation Failed</p>
            <p className="text-xs text-muted-foreground mt-1">
              {job.error_message || 'An unknown error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isStuckAssembling && (
        <div className="pt-2 border-t">
          <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-sm font-semibold text-orange-700 dark:text-orange-400">
              Video Assembly Taking Longer Than Expected
            </AlertTitle>
            <AlertDescription className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              This job has been assembling for over 5 minutes. Try force syncing to check status.
            </AlertDescription>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs border-orange-300 dark:border-orange-800"
              onClick={onRecoverJob}
              disabled={isRecoveringJob}
            >
              {isRecoveringJob ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Force Sync'
              )}
            </Button>
          </Alert>
        </div>
      )}

      {isNearTimeout && timeoutCountdown !== null && timeoutCountdown > 0 && (
        <div className="pt-2 border-t">
          <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Approaching Timeout
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              This generation is taking longer than expected. It will automatically move to My Creations in {timeoutCountdown} seconds.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {showProcessingNote && (
        <div className="text-xs text-muted-foreground italic">
          ⏳ Processing... This usually takes 3-5 minutes
        </div>
      )}
    </>
  );
}
