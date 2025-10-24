import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, Check, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getVoicePreviewUrl } from '@/lib/storage-utils';
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

// Fallback voices with Supabase Storage preview URLs
const FALLBACK_VOICES: Voice[] = [
  { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', preview_url: getVoicePreviewUrl('9BWtsMINqrJLrRacOk9x'), labels: { gender: 'female', accent: 'American', use_case: 'narration' } },
  { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', preview_url: getVoicePreviewUrl('CwhRBWXzGAHq8TQ4Fs17'), labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', preview_url: getVoicePreviewUrl('EXAVITQu4vr4xnSDxMaL'), labels: { gender: 'female', accent: 'American', use_case: 'narration' } },
  { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', preview_url: getVoicePreviewUrl('FGY2WhTYpPnrIDTdsKH5'), labels: { gender: 'female', accent: 'American', use_case: 'narration' } },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', preview_url: getVoicePreviewUrl('IKne3meq5aSn9XLyUdCD'), labels: { gender: 'male', accent: 'British', use_case: 'conversational' } },
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', preview_url: getVoicePreviewUrl('JBFqnCBsd6RMkjVDRZzb'), labels: { gender: 'male', accent: 'British', use_case: 'narration' } },
  { voice_id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', preview_url: getVoicePreviewUrl('N2lVS1w4EtoT3dr4eOWO'), labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', preview_url: getVoicePreviewUrl('SAz9YHcvj6GT2YYXdXww'), labels: { gender: 'neutral', accent: 'American', use_case: 'narration' } },
  { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', preview_url: getVoicePreviewUrl('TX3LPaxmHKxFdv7VOQHJ'), labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', preview_url: getVoicePreviewUrl('XB0fDUnXU5powFXDhCwa'), labels: { gender: 'female', accent: 'British', use_case: 'narration' } },
  { voice_id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', preview_url: getVoicePreviewUrl('Xb7hH8MSUJpSbSDYk0k2'), labels: { gender: 'female', accent: 'British', use_case: 'narration' } },
  { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', preview_url: getVoicePreviewUrl('XrExE9yKIg1WjnnlVkGX'), labels: { gender: 'female', accent: 'American', use_case: 'narration' } },
  { voice_id: 'bIHbv24MWmeRgasZH58o', name: 'Will', preview_url: getVoicePreviewUrl('bIHbv24MWmeRgasZH58o'), labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', preview_url: getVoicePreviewUrl('cgSgspJ2msm6clMCkdW9'), labels: { gender: 'female', accent: 'American', use_case: 'conversational' } },
  { voice_id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', preview_url: getVoicePreviewUrl('cjVigY5qzO86Huf0OWal'), labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', preview_url: getVoicePreviewUrl('iP95p4xoKVk53GoZ742B'), labels: { gender: 'male', accent: 'American', use_case: 'conversational' } },
  { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', preview_url: getVoicePreviewUrl('nPczCjzI2devNBz1zQrb'), labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', preview_url: getVoicePreviewUrl('onwK4e9ZLuTAKqWW03F9'), labels: { gender: 'male', accent: 'British', use_case: 'narration' } },
  { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', preview_url: getVoicePreviewUrl('pFZP5JQG7iQjIQuC4Bku'), labels: { gender: 'female', accent: 'British', use_case: 'narration' } },
  { voice_id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', preview_url: getVoicePreviewUrl('pqHfZKP75CvOlQylNhV4'), labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
];

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
        setVoices(data.voices);
        setFilteredVoices(data.voices);
      } else {
        // Use fallback voices if API fails or returns empty
        console.warn('Using fallback voices');
        setVoices(FALLBACK_VOICES);
        setFilteredVoices(FALLBACK_VOICES);
        toast.info('Using default voice library');
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
      audioRef.current = audio;
      
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => {
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
