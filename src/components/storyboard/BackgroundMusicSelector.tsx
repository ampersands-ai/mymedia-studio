import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Music, RefreshCw, Play, Pause, Volume2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  { value: 'all', label: '🎵 All Genres', query: 'background music instrumental' },
  { value: 'calm', label: '🧘 Calm & Relaxing', query: 'calm relaxing ambient music' },
  { value: 'upbeat', label: '⚡ Upbeat & Energetic', query: 'upbeat energetic happy music' },
  { value: 'dramatic', label: '🎭 Dramatic & Epic', query: 'dramatic epic cinematic music' },
  { value: 'ambient', label: '🌌 Ambient & Atmospheric', query: 'ambient atmospheric space music' },
  { value: 'inspiring', label: '✨ Inspiring & Motivational', query: 'inspiring motivational uplifting music' },
  { value: 'corporate', label: '💼 Corporate & Professional', query: 'corporate business professional music' },
  { value: 'electronic', label: '🎹 Electronic & Synth', query: 'electronic synthwave digital music' },
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
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [selectedPreviewAudio, setSelectedPreviewAudio] = useState<PixabayAudio | null>(null);
  const selectedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open && audioItems.length === 0) {
      const defaultGenre = MUSIC_GENRES.find(g => g.value === 'all');
      if (defaultGenre) searchMusic(defaultGenre.query);
    }
    
    return () => {
      if (playingAudio) {
        playingAudio.pause();
        playingAudio.currentTime = 0;
      }
      if (selectedAudioRef.current) {
        selectedAudioRef.current.pause();
        selectedAudioRef.current.currentTime = 0;
      }
    };
  }, [open]);

  // Update volume for playing audio when slider changes
  useEffect(() => {
    if (playingAudio) {
      playingAudio.volume = volume / 100;
    }
    if (selectedAudioRef.current) {
      selectedAudioRef.current.volume = volume / 100;
    }
  }, [volume]);

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
    setSelectedPreviewAudio(audio);
    toast.success('Background music selected');
    
    // Stop preview audio
    if (playingAudio) {
      playingAudio.pause();
      setPlayingAudio(null);
      setPlayingId(null);
    }
    
    // Don't close dialog - let user keep browsing
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

  const handleGenreChange = (genreValue: string) => {
    setSelectedGenre(genreValue);
    const genre = MUSIC_GENRES.find(g => g.value === genreValue);
    if (genre) {
      searchMusic(genre.query);
    }
  };

  const handlePlaySelectedMusic = () => {
    if (!selectedMusicUrl) return;

    if (selectedAudioRef.current) {
      // Stop if already playing
      selectedAudioRef.current.pause();
      selectedAudioRef.current.currentTime = 0;
      selectedAudioRef.current = null;
      return;
    }

    // Stop any preview audio
    if (playingAudio) {
      playingAudio.pause();
      setPlayingAudio(null);
      setPlayingId(null);
    }

    // Play selected music
    const audio = new Audio(selectedMusicUrl);
    audio.volume = volume / 100;
    audio.play();
    audio.onended = () => {
      selectedAudioRef.current = null;
    };
    selectedAudioRef.current = audio;
  };

  const handleRemoveMusic = () => {
    onSelectMusic('', 0);
    setSelectedPreviewAudio(null);
    if (playingAudio) {
      playingAudio.pause();
      setPlayingAudio(null);
      setPlayingId(null);
    }
    if (selectedAudioRef.current) {
      selectedAudioRef.current.pause();
      selectedAudioRef.current = null;
    }
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
            {/* Current Selection Preview */}
            {selectedMusicUrl && selectedPreviewAudio && (
              <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-bold text-primary">Selected Music</span>
                    </div>
                    <p className="font-medium text-sm truncate">{selectedPreviewAudio.name}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(selectedPreviewAudio.duration)}s
                      </Badge>
                      {selectedPreviewAudio.genre && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedPreviewAudio.genre}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        Volume: {volume}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePlaySelectedMusic}
                      className="gap-2"
                    >
                      {selectedAudioRef.current ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Play
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRemoveMusic}
                      className="gap-2"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Volume
                </Label>
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

            {/* Genre Tabs */}
            <Tabs value={selectedGenre} onValueChange={handleGenreChange}>
              <TabsList className="w-full h-auto flex-wrap">
                {MUSIC_GENRES.map((genre) => (
                  <TabsTrigger 
                    key={genre.value} 
                    value={genre.value}
                    className="text-xs px-2 py-1.5"
                    disabled={loading}
                  >
                    {genre.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

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
