import { RecordingState } from '@/types/procedural-background';
import { Button } from '@/components/ui/button';
import { Circle, Square, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordingControlsProps {
  state: RecordingState;
  duration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadWebM: () => void;
  onDownloadMp4: () => void;
  hasRecording: boolean;
}

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
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
      {/* Recording controls */}
      <div className="flex items-center gap-3">
        {state === 'idle' && (
          <Button
            onClick={onStartRecording}
            className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Circle className="h-4 w-4 fill-current" />
            Record
          </Button>
        )}

        {state === 'recording' && (
          <>
            <Button
              onClick={onStopRecording}
              variant="outline"
              className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Square className="h-4 w-4 fill-current" />
              Stop
            </Button>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
              </span>
              <span className="font-mono text-lg font-semibold text-foreground">
                {formatDuration(duration)}
              </span>
            </div>
          </>
        )}

        {state === 'converting' && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Converting to MP4...</span>
          </div>
        )}
      </div>

      {/* Download controls */}
      <div className={cn('flex items-center gap-2', !hasRecording && 'opacity-50')}>
        <Button
          onClick={onDownloadWebM}
          variant="outline"
          size="sm"
          disabled={!hasRecording || state === 'recording' || state === 'converting'}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          WebM
        </Button>
        <Button
          onClick={onDownloadMp4}
          size="sm"
          disabled={!hasRecording || state === 'recording' || state === 'converting'}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          MP4
        </Button>
      </div>
    </div>
  );
}
