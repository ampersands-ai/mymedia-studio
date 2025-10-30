import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Music, RefreshCw, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface PixabayAudio {
  id: number;
  name: string;
  tags: string;
  duration: number;
  previewURL: string;
  audioURL: string;
  genre: string;
}

interface BackgroundMusicSelectorProps {
  selectedMusicUrl: string;
  selectedMusicVolume: number;
  onSelectMusic: (url: string, volume: number) => void;
}

const MUSIC_GENRES = [
  { value: 'calm', label: '🧘 Calm & Relaxing' },
  { value: 'upbeat', label: '⚡ Upbeat & Energetic' },
  { value: 'dramatic', label: '🎭 Dramatic & Epic' },
  { value: 'ambient', label: '🌌 Ambient & Atmospheric' },
  { value: 'inspiring', label: '✨ Inspiring & Motivational' },
];

export function BackgroundMusicSelector({
  selectedMusicUrl,
  selectedMusicVolume,
  onSelectMusic,
}: BackgroundMusicSelectorProps) {
  const [open, setOpen] = useState(false);
  const [audioItems, setAudioItems] = useState<PixabayAudio[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [volume, setVolume] = useState(selectedMusicVolume || 5);
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    if (open && audioItems.length === 0) {
      searchMusic('calm background music');
    }
    
    return () => {
      if (playingAudio) {
        playingAudio.pause();
        playingAudio.currentTime = 0;
      }
    };
  }, [open]);

  const searchMusic = async (query: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-pixabay-audio', {
        body: { query, per_page: 20 },
      });

      if (error) throw error;
      setAudioItems(data.items || []);
      
      if ((data.items || []).length === 0) {
        toast.info('No music found. Try a different search.');
      }
    } catch (error: any) {
      console.error('Error searching music:', error);
      toast.error(error.message || 'Failed to search music');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMusic = (audio: PixabayAudio) => {
    onSelectMusic(audio.audioURL, volume);
    toast.success('Background music selected');
    if (playingAudio) {
      playingAudio.pause();
      setPlayingAudio(null);
      setPlayingId(null);
    }
    setOpen(false);
  };

  const handlePlayPreview = (audio: PixabayAudio) => {
    if (playingId === audio.id) {
      // Stop current audio
      if (playingAudio) {
        playingAudio.pause();
        playingAudio.currentTime = 0;
      }
      setPlayingAudio(null);
      setPlayingId(null);
      return;
    }

    // Stop any previous audio
    if (playingAudio) {
      playingAudio.pause();
      playingAudio.currentTime = 0;
    }

    // Play new audio
    const newAudio = new Audio(audio.previewURL);
    newAudio.volume = volume / 100;
    newAudio.play();
    newAudio.onended = () => {
      setPlayingAudio(null);
      setPlayingId(null);
    };
    setPlayingAudio(newAudio);
    setPlayingId(audio.id);
  };

  const handleCustomSearch = () => {
    if (searchQuery.trim()) {
      searchMusic(searchQuery);
    }
  };

  const handleGenreSearch = (genre: string) => {
    searchMusic(`${genre} instrumental background music`);
  };

  const handleRemoveMusic = () => {
    onSelectMusic('', 0);
    if (playingAudio) {
      playingAudio.pause();
      setPlayingAudio(null);
      setPlayingId(null);
    }
    setOpen(false);
    toast.success('Background music removed');
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-start"
      >
        {selectedMusicUrl ? (
          <div className="flex items-center gap-2 w-full">
            <Music className="h-4 w-4" />
            <span className="truncate">Background music selected ({selectedMusicVolume}%)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span>Add Background Music (Optional)</span>
          </div>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Background Music</DialogTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <span>Powered by</span>
              <a 
                href="https://pixabay.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold hover:underline text-primary"
              >
                Pixabay
              </a>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Volume</Label>
                <span className="text-sm font-bold text-primary">{volume}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={(values) => setVolume(values[0])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Genre Quick Search */}
            <div className="flex flex-wrap gap-2">
              {MUSIC_GENRES.map((genre) => (
                <Button
                  key={genre.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenreSearch(genre.value)}
                  disabled={loading}
                >
                  {genre.label}
                </Button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for music..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleCustomSearch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Current Selection */}
            {selectedMusicUrl && (
              <div className="p-3 bg-accent/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Currently Selected Music</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleRemoveMusic}>
                    Remove
                  </Button>
                </div>
              </div>
            )}

            {/* Music List */}
            <ScrollArea className="h-[400px] rounded-md border p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : audioItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Music className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No music found</p>
                  <p className="text-sm text-muted-foreground">Try a different search term or genre</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {audioItems.map((audio) => (
                    <div
                      key={audio.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                        selectedMusicUrl === audio.audioURL
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{audio.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(audio.duration)}s
                          </Badge>
                          {audio.genre && (
                            <Badge variant="secondary" className="text-xs">
                              {audio.genre}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePlayPreview(audio)}
                        >
                          {playingId === audio.id ? (
                            <>
                              <Pause className="w-3.5 h-3.5 mr-1" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 mr-1" />
                              Preview
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSelectMusic(audio)}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
