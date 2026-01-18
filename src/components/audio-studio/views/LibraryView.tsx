import { useState } from 'react';
import { Grid3X3, List, Search, Music, Volume2, Zap, FileAudio, Trash2, Loader2, RefreshCw, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrackCard } from '../shared/TrackCard';
import { EmptyState } from '../shared/EmptyState';
import { useAudioPlayer } from '../hooks/useAudioStudioPlayer';
import { useAudioLibrary } from '../hooks/useAudioLibrary';
import { cn } from '@/lib/utils';
import type { LibraryTab, AudioTrack } from '../types/audio-studio.types';
import { toast } from 'sonner';

export function LibraryView() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const { play, currentTrack, isPlaying } = useAudioPlayer();

  // Map tab to filter
  const getFilterFromTab = (tab: LibraryTab): 'all' | 'songs' | 'voiceovers' | 'sfx' | 'stems' | 'favorites' => {
    if (tab === 'all') return 'all';
    if (tab === 'songs') return 'songs';
    if (tab === 'voiceovers') return 'voiceovers';
    if (tab === 'sfx') return 'sfx';
    if (tab === 'stems') return 'stems';
    return 'all';
  };

  const {
    tracks,
    isLoading,
    error,
    refresh,
    toggleLike,
    deleteTrack,
    incrementPlayCount,
  } = useAudioLibrary({
    filter: getFilterFromTab(activeTab),
    searchQuery,
  });

  // Sort tracks
  const sortedTracks = [...tracks].sort((a, b) => {
    if (sortBy === 'name') return a.title.localeCompare(b.title);
    if (sortBy === 'duration') return b.duration - a.duration;
    // Default: recent
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handlePlay = (track: AudioTrack) => {
    play(track);
    incrementPlayCount(track.id);
  };

  const handleDelete = async (track: AudioTrack) => {
    const success = await deleteTrack(track.id);
    if (success) {
      toast.success('Track deleted');
    } else {
      toast.error('Failed to delete track');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-foreground">My Library</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LibraryTab)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-card border border-border p-1 h-auto">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary-orange data-[state=active]:text-black">
              All
            </TabsTrigger>
            <TabsTrigger value="songs" className="gap-1.5 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
              <Music className="h-3.5 w-3.5" /> Songs
            </TabsTrigger>
            <TabsTrigger value="voiceovers" className="gap-1.5 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
              <Volume2 className="h-3.5 w-3.5" /> Voice
            </TabsTrigger>
            <TabsTrigger value="sfx" className="gap-1.5 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
              <Zap className="h-3.5 w-3.5" /> SFX
            </TabsTrigger>
          </TabsList>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[180px] bg-card border-border"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[120px] bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "rounded-none h-9 w-9",
                  viewMode === 'grid' && "bg-primary-orange text-black"
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('list')}
                className={cn(
                  "rounded-none h-9 w-9",
                  viewMode === 'list' && "bg-primary-orange text-black"
                )}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedTracks.length === 0 ? (
            <EmptyState 
              type="library"
              onAction={() => {}}
            />
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                : "flex flex-col gap-2"
            )}>
              {sortedTracks.map((track) => (
                viewMode === 'grid' ? (
                  <TrackCard 
                    key={track.id} 
                    track={track}
                  />
                ) : (
                  <TrackListItem
                    key={track.id}
                    track={track}
                    onPlay={() => handlePlay(track)}
                    onLike={() => toggleLike(track.id)}
                    onDelete={() => handleDelete(track)}
                    isPlaying={currentTrack?.id === track.id && isPlaying}
                  />
                )
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TrackListItemProps {
  track: AudioTrack;
  onPlay: () => void;
  onLike: () => void;
  onDelete: () => void;
  isPlaying: boolean;
}

function TrackListItem({ track, onPlay, onLike, onDelete, isPlaying }: TrackListItemProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = () => {
    switch (track.type) {
      case 'song': return <Music className="h-4 w-4" />;
      case 'voiceover': return <Volume2 className="h-4 w-4" />;
      case 'sfx': return <Zap className="h-4 w-4" />;
      default: return <FileAudio className="h-4 w-4" />;
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg border-2 transition-all",
        "bg-card hover:bg-accent/50 cursor-pointer",
        isPlaying 
          ? "border-primary-orange" 
          : "border-border hover:border-primary-orange/50"
      )}
      onClick={onPlay}
    >
      {/* Thumbnail */}
      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {getTypeIcon()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground truncate">{track.title}</h4>
        <p className="text-sm text-muted-foreground">{track.artist || 'AI Studio'}</p>
      </div>

      {/* Type badge */}
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
        {track.type}
      </span>

      {/* Duration */}
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatDuration(track.duration)}
      </span>

      {/* Actions */}
      <Button 
        variant="ghost" 
        size="icon" 
        className={cn("shrink-0 h-8 w-8", track.isLiked ? "text-accent-pink" : "text-muted-foreground hover:text-accent-pink")}
        onClick={(e) => { e.stopPropagation(); onLike(); }}
      >
        <Heart className={cn("h-4 w-4", track.isLiked && "fill-current")} />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
