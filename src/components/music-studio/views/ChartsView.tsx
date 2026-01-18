import { Trophy, TrendingUp, Clock, Crown, Loader2, Music } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackCard } from '../shared/TrackCard';
import { useDiscoverData } from '../hooks/useDiscoverData';
import { cn } from '@/lib/utils';

export function ChartsView() {
  const { trendingTracks, featuredTracks, isLoading } = useDiscoverData();

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Add rank to tracks
  const rankedTracks = trendingTracks.map((track, index) => ({
    ...track,
    rank: index + 1,
  }));

  if (isLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary-orange" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary-yellow/20 flex items-center justify-center">
          <Trophy className="h-5 w-5 text-primary-yellow" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">Charts</h1>
          <p className="text-sm text-muted-foreground">Top performing AI creations</p>
        </div>
      </div>

      <Tabs defaultValue="top50" className="space-y-6">
        <TabsList className="bg-card border border-border p-1 h-auto">
          <TabsTrigger value="top50" className="gap-1.5 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
            <Crown className="h-3.5 w-3.5" /> Top 50
          </TabsTrigger>
          <TabsTrigger value="trending" className="gap-1.5 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
            <TrendingUp className="h-3.5 w-3.5" /> Trending
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-1.5 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
            <Clock className="h-3.5 w-3.5" /> New
          </TabsTrigger>
        </TabsList>

        <TabsContent value="top50" className="space-y-4">
          {rankedTracks.length > 0 ? (
            <>
              {/* Top 3 Podium */}
              {rankedTracks.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {rankedTracks.slice(0, 3).map((track, index) => (
                    <div 
                      key={track.id}
                      className={cn(
                        "relative p-4 rounded-xl border-2 text-center",
                        index === 0 && "border-primary-yellow bg-primary-yellow/10 order-2",
                        index === 1 && "border-border bg-card order-1 mt-4",
                        index === 2 && "border-border bg-card order-3 mt-6"
                      )}
                    >
                      <div className={cn(
                        "absolute -top-4 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full flex items-center justify-center font-black text-sm",
                        index === 0 && "bg-primary-yellow text-black",
                        index === 1 && "bg-muted text-foreground",
                        index === 2 && "bg-primary-orange/50 text-foreground"
                      )}>
                        {track.rank}
                      </div>
                      {track.artworkUrl ? (
                        <img 
                          src={track.artworkUrl} 
                          alt={track.title}
                          className="h-20 w-20 mx-auto rounded-lg object-cover mb-3"
                        />
                      ) : (
                        <div className="h-20 w-20 mx-auto rounded-lg bg-muted mb-3 flex items-center justify-center">
                          <Music className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Rest of list */}
              <div className="space-y-2">
                {rankedTracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 p-3 rounded-lg border-2 border-border bg-card hover:border-primary-orange/50 transition-all"
                  >
                    <span className="w-8 text-center font-bold text-muted-foreground">
                      #{track.rank}
                    </span>
                    {track.artworkUrl ? (
                      <img 
                        src={track.artworkUrl} 
                        alt={track.title}
                        className="h-12 w-12 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                        <Music className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{track.title}</h4>
                      <p className="text-sm text-muted-foreground">{track.artist || 'AI Generated'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatPlayCount(track.playCount || 0)}</p>
                      <p className="text-xs text-muted-foreground">plays</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tracks on the charts yet</p>
              <p className="text-sm mt-1">Create and share to get on the leaderboard!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending">
          {trendingTracks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {trendingTracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No trending tracks yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="new">
          {featuredTracks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {featuredTracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No new tracks yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
