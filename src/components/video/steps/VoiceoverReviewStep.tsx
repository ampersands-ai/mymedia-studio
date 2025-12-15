import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download, RefreshCw, Loader2 } from 'lucide-react';

interface VoiceoverReviewStepProps {
  voiceoverUrl: string;
  voiceoverTier: 'standard' | 'pro';
  onRegenerate: () => void;
  onContinue: () => void;
  isRegenerating: boolean;
  isDisabled: boolean;
  availableCredits: number;
}

export function VoiceoverReviewStep({
  voiceoverUrl,
  voiceoverTier,
  onRegenerate,
  onContinue,
  isRegenerating,
  isDisabled,
  availableCredits,
}: VoiceoverReviewStepProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Regeneration cost: 3 for standard, 6 for pro
  const regenerateCost = voiceoverTier === 'pro' ? 6 : 3;
  const canAffordRegenerate = availableCredits >= regenerateCost;

  useEffect(() => {
    const audio = new Audio(voiceoverUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [voiceoverUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = voiceoverUrl;
    link.download = 'voiceover.mp3';
    link.click();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const seekToPosition = (clientX: number) => {
    if (!audioRef.current || !progressRef.current || duration === 0) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = clickX / rect.width;
    const newTime = percent * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    seekToPosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    seekToPosition(e.touches[0].clientX);
  };

  // Add/remove global listeners for dragging
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      seekToPosition(clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, duration]);

  const handleContinue = () => {
    // Pause audio when continuing
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    onContinue();
  };

  return (
    <div className="space-y-4">
      {/* Audio Player */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlayPause}
            disabled={isDisabled}
            className="h-12 w-12 shrink-0"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <div className="flex-1 space-y-1">
            {/* Progress Bar - Click and drag to seek */}
            <div 
              ref={progressRef}
              className="h-3 bg-muted rounded-full overflow-hidden cursor-pointer relative select-none touch-none"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div
                className="h-full bg-primary transition-[width] duration-75 pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
              {/* Seek handle */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-md pointer-events-none"
                style={{ left: `calc(${progressPercent}% - 8px)` }}
              />
            </div>
            {/* Time Display */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            disabled={isDisabled}
            className="h-10 w-10 shrink-0"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Regenerate Button */}
      <Button
        variant="outline"
        onClick={onRegenerate}
        disabled={isDisabled || isRegenerating || !canAffordRegenerate}
        className="w-full min-h-[44px]"
      >
        {isRegenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Regenerating...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate Voiceover ({regenerateCost} credits)
          </>
        )}
      </Button>
      {!canAffordRegenerate && (
        <p className="text-xs text-destructive text-center">
          Insufficient credits to regenerate ({availableCredits} available)
        </p>
      )}

      {/* Continue Button */}
      <Button
        onClick={handleContinue}
        disabled={isDisabled}
        className="w-full min-h-[48px] font-bold"
        size="lg"
      >
        Continue to Render Setup
      </Button>
    </div>
  );
}
