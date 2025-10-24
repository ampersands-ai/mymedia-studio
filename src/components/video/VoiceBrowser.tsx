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

// Fallback voices from ElevenLabs default library with preview URLs
const FALLBACK_VOICES: Voice[] = [
  { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/9BWtsMINqrJLrRacOk9x/df6788f9-5c96-470d-8312-aab3b3d8f50a.mp3', labels: { gender: 'female', accent: 'American', use_case: 'narration' } },
  { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/1e535bf9-f393-4d3c-a0e3-91c5c1e510f8.mp3', labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/4b3d6f97-9e2d-4d95-bb27-1e79c8cfae13.mp3', labels: { gender: 'female', accent: 'American', use_case: 'narration' } },
  { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/FGY2WhTYpPnrIDTdsKH5/4d2fd738-3b3d-4368-957a-bb4805275bd9.mp3', labels: { gender: 'female', accent: 'American', use_case: 'narration' } },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/IKne3meq5aSn9XLyUdCD/102de6f2-22ed-43e0-a1f1-111fa75c5481.mp3', labels: { gender: 'male', accent: 'British', use_case: 'conversational' } },
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/JBFqnCBsd6RMkjVDRZzb/e6206d1a-0721-4787-aafb-06a6e705cac5.mp3', labels: { gender: 'male', accent: 'British', use_case: 'narration' } },
  { voice_id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/N2lVS1w4EtoT3dr4eOWO/ac833bd8-ffda-4938-9ebc-b0f99ca25481.mp3', labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/SAz9YHcvj6GT2YYXdXww/99830aad-cd59-4d62-bb73-b3db1140f110.mp3', labels: { gender: 'neutral', accent: 'American', use_case: 'narration' } },
  { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/TX3LPaxmHKxFdv7VOQHJ/cb49bb5c-9f4a-4e31-9d79-c207b027c442.mp3', labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/XB0fDUnXU5powFXDhCwa/942356dc-f10d-4d89-bda5-4f8505ee038b.mp3', labels: { gender: 'female', accent: 'British', use_case: 'narration' } },
  { voice_id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3', labels: { gender: 'female', accent: 'British', use_case: 'narration' } },
  { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/XrExE9yKIg1WjnnlVkGX/b9455fc4-4f37-45dc-9623-bb24ef7b7c1e.mp3', labels: { gender: 'female', accent: 'American', use_case: 'narration' } },
  { voice_id: 'bIHbv24MWmeRgasZH58o', name: 'Will', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/bIHbv24MWmeRgasZH58o/e3c2c188-fc2c-490e-a2d6-9ec7c7c8e98f.mp3', labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cgSgspJ2msm6clMCkdW9/819c34e7-ff1b-43db-bb65-f87d4c5e3c9f.mp3', labels: { gender: 'female', accent: 'American', use_case: 'conversational' } },
  { voice_id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/65a45b78-0007-4014-ae45-03fd1e14d316.mp3', labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/iP95p4xoKVk53GoZ742B/e6d3d7a7-c083-4e9f-bb48-87918c27f9cc.mp3', labels: { gender: 'male', accent: 'American', use_case: 'conversational' } },
  { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/nPczCjzI2devNBz1zQrb/38f4c4ae-9f24-4422-ab6c-89c166bc5633.mp3', labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/onwK4e9ZLuTAKqWW03F9/1c4d417c-ba80-4de8-874a-a286cab7f776.mp3', labels: { gender: 'male', accent: 'British', use_case: 'narration' } },
  { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pFZP5JQG7iQjIQuC4Bku/4a2c33c0-da11-4489-9cd3-5718a174c60d.mp3', labels: { gender: 'female', accent: 'British', use_case: 'narration' } },
  { voice_id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', preview_url: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pqHfZKP75CvOlQylNhV4/3af8f718-2931-4de5-a812-787e619695c2.mp3', labels: { gender: 'male', accent: 'American', use_case: 'narration' } },
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
