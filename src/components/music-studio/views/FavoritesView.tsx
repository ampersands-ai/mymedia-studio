import { Heart, Play, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackCard } from '../shared/TrackCard';

import { useAudioPlayer } from '../hooks/useAudioStudioPlayer';
import { useAudioLibrary } from '../hooks/useAudioLibrary';

export function FavoritesView() {
  const { play, addToQueue } = useAudioPlayer();
  
  // Fetch real liked tracks from the library
  const { tracks, isLoading } = useAudioLibrary({ filter: 'favorites' });
  const likedTracks = tracks.filter(track => track.isLiked);

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      play(likedTracks[0]);
      if (likedTracks.length > 1) {
        addToQueue(likedTracks.slice(1));
      }
    }
  };

  const handleShuffle = () => {
    const shuffled = [...likedTracks].sort(() => Math.random() - 0.5);
    if (shuffled.length > 0) {
      play(shuffled[0]);
      if (shuffled.length > 1) {
        addToQueue(shuffled.slice(1));
      }
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-pink to-accent-purple flex items-center justify-center">
            <Heart className="h-6 w-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Favorites</h1>
            <p className="text-sm text-muted-foreground">{likedTracks.length} liked tracks</p>
          </div>
        </div>

        {likedTracks.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 border-2"
              onClick={handleShuffle}
            >
              <Shuffle className="h-4 w-4" />
              Shuffle
            </Button>
            <Button
              className="gap-2 bg-primary-orange hover:bg-primary-orange/90 text-black"
              onClick={handlePlayAll}
            >
              <Play className="h-4 w-4" />
              Play All
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : likedTracks.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center">
          <p className="text-muted-foreground">No favorites yet...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {likedTracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      )}
    </div>
  );
}
