import { Search, TrendingUp, Sparkles, Music, Mic, Zap, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GenreCard } from '../shared/GenreCard';
import { TrackCard } from '../shared/TrackCard';
import { GENRES } from '../data/mock-data';
import { useDiscoverData } from '../hooks/useDiscoverData';
import { useState } from 'react';

export function DiscoverView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  
  const { featuredTracks, communityTracks, isLoading } = useDiscoverData();

  const categories = [
    { id: 'trending', label: 'Trending', icon: TrendingUp, color: 'primary-orange' },
    { id: 'new', label: 'New Releases', icon: Sparkles, color: 'accent-purple' },
    { id: 'songs', label: 'AI Songs', icon: Music, color: 'accent-pink' },
    { id: 'voices', label: 'Voice Overs', icon: Mic, color: 'primary-yellow' },
    { id: 'sfx', label: 'Sound Effects', icon: Zap, color: 'accent-cyan' },
  ];

  // Filter tracks based on search query
  const filterTracks = (tracks: typeof featuredTracks) => {
    if (!searchQuery) return tracks;
    const query = searchQuery.toLowerCase();
    return tracks.filter(track => 
      track.title.toLowerCase().includes(query) ||
      track.artist?.toLowerCase().includes(query) ||
      track.genre?.toLowerCase().includes(query)
    );
  };

  const filteredFeatured = filterTracks(featuredTracks);
  const filteredCommunity = filterTracks(communityTracks);

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header with Search */}
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-foreground">Discover</h1>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tracks, genres, moods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-2 border-border focus:border-primary-orange"
          />
        </div>
      </div>

      {/* Quick Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant="outline"
            className="gap-2 border-2 hover:border-primary-orange hover:bg-primary-orange/10"
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Browse by Genre */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-4">Browse by Genre</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {GENRES.slice(0, 10).map((genre) => (
            <GenreCard
              key={genre.value}
              genre={genre}
              isSelected={selectedGenre === genre.value}
              onClick={() => setSelectedGenre(selectedGenre === genre.value ? null : genre.value)}
            />
          ))}
        </div>
      </section>

      {/* Featured Tracks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Featured Creations</h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            View All
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary-orange" />
          </div>
        ) : filteredFeatured.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFeatured.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No featured tracks yet</p>
          </div>
        )}
      </section>

      {/* Community Picks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Community Favorites</h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            View All
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary-orange" />
          </div>
        ) : filteredCommunity.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredCommunity.map((track) => (
              <TrackCard key={`community-${track.id}`} track={track} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No community tracks yet. Be the first to share!</p>
          </div>
        )}
      </section>
    </div>
  );
}
