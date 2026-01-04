import { RecordingState } from '@/types/procedural-background';
import { Button } from '@/components/ui/button';
import { Circle, Square, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { shouldAllowMp4Conversion } from '@/utils/deviceCapabilities';

interface RecordingControlsProps {
  state: RecordingState;
  duration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadWebM: () => void;
  onDownloadMp4: () => void;
  hasRecording: boolean;
}

const canConvertMp4 = shouldAllowMp4Conversion();

export function RecordingControls({
  state,
  duration,
  onStartRecording,
  onStopRecording,
  onDownloadWebM,
  onDownloadMp4,
  hasRecording,
}: RecordingControlsProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:p-4">
      {/* Recording controls */}
      <div className="flex items-center justify-center gap-3 sm:justify-start">
        {(state === 'idle' || state === 'ready') && (
          <Button
            onClick={onStartRecording}
            className="h-11 min-w-[120px] gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:h-10"
          >
            <Circle className="h-4 w-4 fill-current" />
            {state === 'ready' ? 'Record Again' : 'Record'}
          </Button>
        )}

        {state === 'recording' && (
          <>
            <Button
              onClick={onStopRecording}
              variant="outline"
              className="h-11 min-w-[100px] gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground sm:h-10"
            >
              <Square className="h-4 w-4 fill-current" />
              Stop
            </Button>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
              </span>
              <span className="font-mono text-base font-semibold text-foreground sm:text-lg">
                {formatDuration(duration)}
              </span>
            </div>
          </>
        )}

        {state === 'converting' && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Converting...</span>
          </div>
        )}
      </div>

      {/* Download controls */}
      <div className={cn(
        'flex items-center justify-center gap-2 sm:justify-end',
        !hasRecording && 'opacity-50'
      )}>
        <Button
          onClick={onDownloadWebM}
          variant="outline"
          disabled={!hasRecording || state === 'recording' || state === 'converting'}
          className="h-11 flex-1 gap-2 sm:h-10 sm:flex-none"
        >
          <Download className="h-4 w-4" />
          WebM
        </Button>
        {canConvertMp4 && (
          <Button
            onClick={onDownloadMp4}
            disabled={!hasRecording || state === 'recording' || state === 'converting'}
            className="h-11 flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:h-10 sm:flex-none"
          >
            <Download className="h-4 w-4" />
            MP4
          </Button>
        )}
      </div>
    </div>
  );
}
