import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, Check, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getVoicePreviewUrl } from '@/lib/storage-utils';
import { VOICE_DATABASE } from '@/lib/voice-mapping';
import { toast } from 'sonner';

interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
  category?: string;
  description?: string;
  labels: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
}

// Fallback voices using central voice database
const FALLBACK_VOICES: Voice[] = VOICE_DATABASE.map(voice => ({
  voice_id: voice.voice_id,
  name: voice.name,
  preview_url: getVoicePreviewUrl(voice.voice_id),
  description: voice.description,
  labels: {
    gender: voice.gender,
    accent: voice.accent,
    use_case: voice.use_case,
  }
}));

interface VoiceBrowserProps {
  selectedVoiceId?: string;
  onSelectVoice: (voiceId: string, voiceName: string) => void;
}

export function VoiceBrowser({ selectedVoiceId, onSelectVoice }: VoiceBrowserProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  useEffect(() => {
    filterVoices();
  }, [searchQuery, selectedFilter, voices]);

  const fetchVoices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-voices');
      
      if (error) throw error;
      
      if (data?.voices && Array.isArray(data.voices) && data.voices.length > 0) {
        // Filter to only voices with valid preview URLs
        const voicesWithPreviews = data.voices.filter(v => v.preview_url && v.preview_url.length > 0);
        console.log(`Filtered ${data.voices.length} voices to ${voicesWithPreviews.length} with previews`);
        
        if (voicesWithPreviews.length > 0) {
          setVoices(voicesWithPreviews);
          setFilteredVoices(voicesWithPreviews);
        } else {
          // Use fallback if all voices lack previews
          console.log('No voices with previews, using fallback');
          setVoices(FALLBACK_VOICES);
          setFilteredVoices(FALLBACK_VOICES);
        }
      } else {
        // Use fallback voices if API fails or returns empty
        console.log('Using fallback voices');
        setVoices(FALLBACK_VOICES);
        setFilteredVoices(FALLBACK_VOICES);
      }
    } catch (error: any) {
      console.error('Error fetching voices:', error);
      // Use fallback voices on error
      setVoices(FALLBACK_VOICES);
      setFilteredVoices(FALLBACK_VOICES);
      toast.error('Using default voices - preview unavailable');
    } finally {
      setLoading(false);
    }
  };

  const filterVoices = () => {
    let filtered = voices;

    if (searchQuery) {
      filtered = filtered.filter(voice =>
        voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.labels.accent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voice.labels.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(voice => 
        voice.labels.gender?.toLowerCase() === selectedFilter ||
        voice.labels.accent?.toLowerCase().includes(selectedFilter) ||
        voice.labels.use_case?.toLowerCase().includes(selectedFilter)
      );
    }

    setFilteredVoices(filtered);
  };

  const playVoicePreview = async (voice: Voice) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (playingVoiceId === voice.voice_id) {
        setPlayingVoiceId(null);
        return;
      }

      if (!voice.preview_url) {
        toast.error('Preview not available for this voice');
        return;
      }

      setPlayingVoiceId(voice.voice_id);

      const audio = new Audio(voice.preview_url);
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
      
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = (e) => {
        console.error('Audio preview failed for', voice.preview_url, e);
        setPlayingVoiceId(null);
        toast.error('Preview unavailable');
      };
      
      await audio.play();
    } catch (error) {
      setPlayingVoiceId(null);
    }
  };

  const getVoiceTags = (voice: Voice) => {
    const tags: string[] = [];
    
    if (voice.labels.gender) tags.push(voice.labels.gender);
    if (voice.labels.age) tags.push(voice.labels.age);
    if (voice.labels.accent) tags.push(voice.labels.accent);
    if (voice.labels.use_case) tags.push(voice.labels.use_case);
    
    return tags;
  };

  const filters = [
    { label: 'All', value: 'all' },
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'British', value: 'british' },
    { label: 'American', value: 'american' },
    { label: 'Narration', value: 'narration' },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search voices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map(filter => (
          <Button
            key={filter.value}
            variant={selectedFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter(filter.value)}
            className="text-xs"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <ScrollArea className="h-[400px] max-h-[60vh]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pr-2 md:pr-4">
            {filteredVoices.map(voice => (
              <Card
                key={voice.voice_id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedVoiceId === voice.voice_id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start justify-between mb-2 md:mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm md:text-base truncate">{voice.name}</h4>
                        {selectedVoiceId === voice.voice_id && (
                          <Check className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </div>
                      {voice.labels.description && (
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                          {voice.labels.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2 md:mb-3">
                    {getVoiceTags(voice).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {voice.preview_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => playVoicePreview(voice)}
                        className="flex-1 text-xs md:text-sm"
                      >
                        {playingVoiceId === voice.voice_id ? (
                          <>
                            <Pause className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            Preview
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => onSelectVoice(voice.voice_id, voice.name)}
                      disabled={selectedVoiceId === voice.voice_id}
                      className={`text-xs md:text-sm ${!voice.preview_url ? 'flex-1' : ''}`}
                    >
                      {selectedVoiceId === voice.voice_id ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
