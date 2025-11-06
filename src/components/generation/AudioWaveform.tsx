import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioWaveformProps {
  audioUrl: string;
  className?: string;
}

export const AudioWaveform = ({ audioUrl, className }: AudioWaveformProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'hsl(var(--muted-foreground) / 0.3)',
      progressColor: 'hsl(var(--primary))',
      cursorColor: 'hsl(var(--primary))',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 64,
      normalize: true,
      backend: 'WebAudio',
    });

    wavesurferRef.current = wavesurfer;

    // Load audio
    wavesurfer.load(audioUrl);

    // Event listeners
    wavesurfer.on('ready', () => {
      setIsReady(true);
      const dur = wavesurfer.getDuration();
      setDuration(formatTime(dur));
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));
    
    wavesurfer.on('timeupdate', (time) => {
      setCurrentTime(formatTime(time));
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
          <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Audio File</p>
          <p className="text-xs text-muted-foreground">Generated audio content</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlayPause}
          disabled={!isReady}
          className="h-10 w-10 flex-shrink-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div ref={containerRef} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{currentTime}</span>
            <span>{duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
