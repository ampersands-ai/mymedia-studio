import { Music } from 'lucide-react';

interface AudioWaveformProps {
  audioUrl: string;
  className?: string;
}

export const AudioWaveform = ({ audioUrl, className }: AudioWaveformProps) => {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
          <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">Audio File</p>
          <p className="text-xs text-muted-foreground break-words">Generated audio content</p>
        </div>
      </div>

      <audio
        src={audioUrl}
        controls
        preload="metadata"
        className="w-full"
        onError={(e) => {
          console.error('Audio playback error:', e);
        }}
      />
    </div>
  );
};
