import { useState } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, ListMusic, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { WaveformVisualizer } from '../shared/WaveformVisualizer';
import { useAudioPlayer } from '../hooks/useAudioStudioPlayer';
import { AudioQueueSheet } from './AudioQueueSheet';
import { cn } from '@/lib/utils';

export function FullScreenPlayer() {
  const [isQueueOpen, setQueueOpen] = useState(false);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const cycleRepeatMode = () => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={toggleFullScreen}>
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">Now Playing</span>
        <Button variant="ghost" size="icon" onClick={() => setQueueOpen(true)}>
          <ListMusic className="h-5 w-5" />
        </Button>
      </div>

      {/* Queue Sheet for FullScreen mode */}
      <AudioQueueSheet open={isQueueOpen} onOpenChange={setQueueOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        {/* Artwork */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl border-2 border-border bg-card overflow-hidden shadow-brutal">
          {currentTrack.artworkUrl ? (
            <img 
              src={currentTrack.artworkUrl} 
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-orange to-accent-purple">
              <WaveformVisualizer isPlaying={isPlaying} barCount={12} />
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-2xl font-black text-foreground truncate">{currentTrack.title}</h2>
          <p className="text-muted-foreground">{currentTrack.artist || 'AI Studio'}</p>
          {currentTrack.genre && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary-orange/20 text-primary-orange capitalize">
              {currentTrack.genre}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="w-full max-w-md space-y-2">
          <Slider
            value={[progress]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleShuffle}
            className={cn(isShuffled && "text-primary-orange")}
          >
            <Shuffle className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={previous}>
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button
            size="lg"
            onClick={toggle}
            className="h-16 w-16 rounded-full bg-primary-orange hover:bg-primary-orange/90 text-black"
          >
            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={next}>
            <SkipForward className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={cycleRepeatMode}
            className={cn(repeatMode !== 'off' && "text-primary-orange")}
          >
            {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <Button variant="ghost" size="icon" onClick={toggleMute}>
            {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={(v) => setVolume(v[0])}
            className="flex-1"
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border flex justify-center gap-4">
        <Button variant="outline" size="sm" className="gap-2">
          <Heart className="h-4 w-4" />
          Like
        </Button>
      </div>
    </div>
  );
}
