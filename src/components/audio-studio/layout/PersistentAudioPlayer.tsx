import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Repeat, 
  Repeat1, 
  Shuffle, 
  ListMusic,
  Maximize2,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useAudioPlayer } from '../hooks/useAudioStudioPlayer';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface PersistentAudioPlayerProps {
  className?: string;
  onOpenQueue?: () => void;
}

export function PersistentAudioPlayer({ className, onOpenQueue }: PersistentAudioPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    setRepeatMode,
    toggleShuffle,
    toggleFullScreen,
  } = useAudioPlayer();

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const cycleRepeatMode = () => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  if (!currentTrack) {
    return (
      <div className={cn(
        'fixed bottom-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-lg border-t border-border z-40 hidden md:flex items-center justify-center',
        className
      )}>
        <p className="text-sm text-muted-foreground">No track playing</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-lg border-t border-border z-40 hidden md:block',
      className
    )}>
      <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 w-[240px] min-w-0">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary-orange/20 to-accent-purple/20 flex items-center justify-center flex-shrink-0 border border-border">
            <ListMusic className="h-5 w-5 text-primary-orange" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist || 'AI Studio'}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-accent-pink">
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        {/* Playback Controls */}
        <div className="flex-1 flex flex-col items-center gap-1 max-w-[600px]">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', isShuffled && 'text-primary-orange')}
              onClick={toggleShuffle}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={previous}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full bg-foreground hover:bg-foreground/90 text-background"
              onClick={toggle}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', repeatMode !== 'off' && 'text-primary-orange')}
              onClick={cycleRepeatMode}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="h-4 w-4" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10 text-right tabular-nums">
              {formatTime(progress)}
            </span>
            <Slider
              value={[progress]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-10 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume & Actions */}
        <div className="flex items-center gap-2 w-[200px] justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenQueue}>
            <ListMusic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-24"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullScreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Mini player for mobile
export function MiniAudioPlayer({ className }: { className?: string }) {
  const { currentTrack, isPlaying, progress, duration, toggle } = useAudioPlayer();

  if (!currentTrack) return null;

  const progressPercent = duration ? (progress / duration) * 100 : 0;

  return (
    <div className={cn(
      'fixed bottom-14 left-0 right-0 h-16 bg-card/95 backdrop-blur-lg border-t border-border z-40 md:hidden',
      className
    )}
    style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))' }}
    >
      {/* Progress indicator */}
      <div className="absolute top-0 left-0 h-0.5 bg-primary-orange/30 w-full">
        <div 
          className="h-full bg-primary-orange transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      <div className="h-full px-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-orange/20 to-accent-purple/20 flex items-center justify-center flex-shrink-0 border border-border">
          <ListMusic className="h-4 w-4 text-primary-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
          <p className="text-xs text-muted-foreground truncate">{currentTrack.artist || 'AI Studio'}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90"
          onClick={toggle}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
