import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, Check, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  category: string;
  description?: string;
  labels: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
}

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
      if (data.error) throw new Error(data.error);
      
      setVoices(data.voices || []);
      setFilteredVoices(data.voices || []);
    } catch (error: any) {
      console.error('Error fetching voices:', error);
      toast.error(error.message || 'Failed to load voices');
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

      setPlayingVoiceId(voice.voice_id);

      if (voice.preview_url) {
        const audio = new Audio(voice.preview_url);
        audioRef.current = audio;
        
        audio.onended = () => setPlayingVoiceId(null);
        audio.onerror = () => {
          setPlayingVoiceId(null);
          toast.error('Failed to play preview');
        };
        
        await audio.play();
      }
    } catch (error) {
      setPlayingVoiceId(null);
      toast.error('Failed to play preview');
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
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search voices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
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
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <ScrollArea className="h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
            {filteredVoices.map(voice => (
              <Card
                key={voice.voice_id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedVoiceId === voice.voice_id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{voice.name}</h4>
                        {selectedVoiceId === voice.voice_id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      {voice.labels.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {voice.labels.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {getVoiceTags(voice).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => playVoicePreview(voice)}
                      className="flex-1"
                    >
                      {playingVoiceId === voice.voice_id ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Preview
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onSelectVoice(voice.voice_id, voice.name)}
                      disabled={selectedVoiceId === voice.voice_id}
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
