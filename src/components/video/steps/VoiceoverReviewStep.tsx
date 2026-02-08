import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download, RefreshCw, Loader2, Coins } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VoiceoverReviewStepProps {
  voiceoverUrl: string;
  scriptLength: number;
  onRegenerate: (tier: 'standard' | 'pro') => void;
  onContinue: () => void;
  isRegenerating: boolean;
  isDisabled: boolean;
  availableCredits: number;
}

export function VoiceoverReviewStep({
  voiceoverUrl,
  scriptLength,
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
  const [pendingRegenTier, setPendingRegenTier] = useState<'standard' | 'pro' | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Regeneration costs: 3/6 credits per 1000 characters
  const charBlocks = Math.max(1, Math.ceil(scriptLength / 1000));
  const standardCost = charBlocks * 3;
  const proCost = charBlocks * 6;
  const canAffordStandard = availableCredits >= standardCost;
  const canAffordPro = availableCredits >= proCost;

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

      {/* Regenerate Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => setPendingRegenTier('standard')}
          disabled={isDisabled || isRegenerating || !canAffordStandard}
          className="min-h-[44px] px-2 sm:px-4"
        >
        {isRegenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="flex items-center justify-center gap-1 text-xs sm:text-sm">
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Standard</span>
              <span className="flex items-center shrink-0">
                (<Coins className="h-3 w-3" />{standardCost})
              </span>
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => setPendingRegenTier('pro')}
          disabled={isDisabled || isRegenerating || !canAffordPro}
          className="min-h-[44px] px-2 sm:px-4"
        >
          {isRegenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="flex items-center justify-center gap-1 text-xs sm:text-sm">
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Pro</span>
              <span className="flex items-center shrink-0">
                (<Coins className="h-3 w-3" />{proCost})
              </span>
            </span>
          )}
        </Button>
      </div>
      {!canAffordStandard && (
        <p className="text-xs text-destructive text-center">
          Insufficient credits ({availableCredits} available)
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

      {/* Regeneration Confirmation Dialog */}
      <AlertDialog open={!!pendingRegenTier} onOpenChange={(open) => !open && setPendingRegenTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Voiceover?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new {pendingRegenTier === 'pro' ? 'Pro' : 'Standard'} voiceover and cost{' '}
              <span className="font-semibold text-foreground">
                {pendingRegenTier === 'pro' ? proCost : standardCost} credits
              </span>.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRegenTier) onRegenerate(pendingRegenTier);
                setPendingRegenTier(null);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
