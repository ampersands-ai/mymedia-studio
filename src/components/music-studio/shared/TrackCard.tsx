import { Play, Pause, Heart, MoreHorizontal, Music, Download, Trash2, Share } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAudioPlayer } from '../hooks/useAudioStudioPlayer';
import type { AudioTrack } from '../types/music-studio.types';
import { toast } from 'sonner';

interface TrackCardProps {
  track: AudioTrack;
  showArtist?: boolean;
  className?: string;
  onLike?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  onDownload?: (track: AudioTrack) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TrackCard({ 
  track, 
  showArtist = true, 
  className,
  onLike,
  onDelete,
  onDownload,
}: TrackCardProps) {
  const { currentTrack, isPlaying, play, pause } = useAudioPlayer();
  const isCurrentTrack = currentTrack?.id === track.id;
  const isThisPlaying = isCurrentTrack && isPlaying;

  const handlePlayPause = () => {
    if (isThisPlaying) {
      pause();
    } else {
      play(track);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(track.id);
  };

  const handleDownload = async () => {
    if (onDownload) {
      onDownload(track);
      return;
    }
    
    // Default download behavior
    try {
      const response = await fetch(track.audioUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download');
    }
  };

  const handleDelete = () => {
    onDelete?.(track.id);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(track.audioUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div
      className={cn(
        'group relative rounded-xl bg-card border border-border p-3 transition-all duration-200',
        'hover:bg-muted/50 hover:border-primary-orange/30 hover:shadow-lg',
        isCurrentTrack && 'border-primary-orange/50 bg-primary-orange/5',
        className
      )}
    >
      {/* Artwork */}
      <div className="relative aspect-square rounded-lg bg-gradient-to-br from-primary-orange/20 via-accent-purple/20 to-accent-pink/20 mb-3 overflow-hidden border border-border">
        <div className="absolute inset-0 flex items-center justify-center">
          <Music className="h-8 w-8 text-primary-orange/50" />
        </div>
        
        {/* Play overlay */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200',
          isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          <Button
            variant="default"
            size="icon"
            className="h-12 w-12 rounded-full bg-primary-orange hover:bg-primary-orange/90 text-black shadow-lg"
            onClick={handlePlayPause}
          >
            {isThisPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground truncate">{track.title}</p>
        {showArtist && (
          <p className="text-xs text-muted-foreground truncate">{track.artist || 'AI Studio'}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{formatDuration(track.duration)}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6',
                track.isLiked ? 'text-accent-pink' : 'text-muted-foreground hover:text-accent-pink'
              )}
              onClick={handleLike}
            >
              <Heart className={cn('h-3 w-3', track.isLiked && 'fill-current')} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare} className="gap-2">
                  <Share className="h-4 w-4" />
                  Copy Link
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleDelete} 
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
