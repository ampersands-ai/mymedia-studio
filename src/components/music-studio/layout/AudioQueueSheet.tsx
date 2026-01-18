import { Play, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAudioPlayer } from '../hooks/useAudioStudioPlayer';
import { cn } from '@/lib/utils';

interface AudioQueueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AudioQueueSheet({ open, onOpenChange }: AudioQueueSheetProps) {
  const { queue, currentTrack, playFromQueue, removeFromQueue, clearQueue } = useAudioPlayer();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md border-l-2 border-border">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-black">Play Queue</SheetTitle>
            {queue.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearQueue}
                className="text-muted-foreground hover:text-destructive"
              >
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {/* Now Playing */}
          {currentTrack && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Now Playing
              </h3>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary-orange/10 border-2 border-primary-orange">
                <div className="h-12 w-12 rounded-lg bg-primary-orange/20 flex items-center justify-center shrink-0">
                  <Play className="h-5 w-5 text-primary-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{currentTrack.title}</p>
                  <p className="text-sm text-muted-foreground">{currentTrack.artist || 'AI Studio'}</p>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatDuration(currentTrack.duration)}
                </span>
              </div>
            </div>
          )}

          {/* Up Next */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Up Next ({queue.length})
            </h3>
            
            {queue.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Queue is empty</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Add tracks from your library
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((track, index) => (
                  <div
                    key={track.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                      "bg-card border-border hover:border-primary-orange/50 group"
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                    
                    <div 
                      className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 cursor-pointer hover:bg-primary-orange/20"
                      onClick={() => playFromQueue(index)}
                    >
                      <Play className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{track.title}</p>
                      <p className="text-sm text-muted-foreground">{track.artist || 'AI Studio'}</p>
                    </div>
                    
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatDuration(track.duration)}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromQueue(track.id)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
