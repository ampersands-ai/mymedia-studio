import { Search, TrendingUp, Sparkles, Music, Mic, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GenreCard } from '../shared/GenreCard';
import { TrackCard } from '../shared/TrackCard';
import { GENRES, MOCK_TRACKS } from '../data/mock-data';
import { useState } from 'react';

export function DiscoverView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const categories = [
    { id: 'trending', label: 'Trending', icon: TrendingUp, color: 'primary-orange' },
    { id: 'new', label: 'New Releases', icon: Sparkles, color: 'accent-purple' },
    { id: 'songs', label: 'AI Songs', icon: Music, color: 'accent-pink' },
    { id: 'voices', label: 'Voice Overs', icon: Mic, color: 'primary-yellow' },
    { id: 'sfx', label: 'Sound Effects', icon: Zap, color: 'accent-cyan' },
  ];

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {MOCK_TRACKS.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      </section>

      {/* Community Picks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Community Favorites</h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            View All
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...MOCK_TRACKS].reverse().map((track) => (
            <TrackCard key={`community-${track.id}`} track={track} />
          ))}
        </div>
      </section>
    </div>
  );
}
