import { useState, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, Check, Search, X } from 'lucide-react';
import { getVoicePreviewUrl } from '@/lib/storage-utils';
import { VOICE_DATABASE, VoiceData, getVoiceById, getVoiceByName } from '@/lib/voice-mapping';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceSelectorProps {
  selectedValue: string;              // voice_id for highlighting selected voice
  onSelectVoice: (voiceId: string, voiceName: string) => void;  // Returns both ID and name
  disabled?: boolean;
}

export function VoiceSelector({ selectedValue, onSelectVoice, disabled }: VoiceSelectorProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get all voices from central database
  const voices = VOICE_DATABASE;
  
  // Memoize filtered voices to prevent unnecessary recalculations
  const filteredVoices = useMemo(() => {
    return voices
      .filter(voice => {
        const matchesSearch = voice.name.toLowerCase().includes(search.toLowerCase()) ||
                             voice.description?.toLowerCase().includes(search.toLowerCase());
        
        const matchesFilter = filter === 'all' || 
                             voice.gender === filter || 
                             voice.accent.toLowerCase() === filter ||
                             voice.use_case === filter;
        
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        // Sort voices with previews first, then those without
        const aHasPreview = a.hasPreview !== false;
        const bHasPreview = b.hasPreview !== false;
        if (aHasPreview === bHasPreview) return 0;
        return aHasPreview ? -1 : 1;
      });
  }, [search, filter, voices]);

  // Determine selected voice by ID (memoized)
  const selectedVoice = useMemo(() => getVoiceById(selectedValue), [selectedValue]);

  const handleSelect = (voice: VoiceData) => {
    if (disabled) return;
    onSelectVoice(voice.voice_id, voice.name);
  };

  // Audio preview using Supabase Storage
  const handlePreview = async (voiceId: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (playingVoiceId === voiceId) {
        setPlayingVoiceId(null);
        return;
      }

      setPlayingVoiceId(voiceId);

      const previewUrl = getVoicePreviewUrl(voiceId);
      const audio = new Audio(previewUrl);
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
      
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => {
        console.error('Audio preview failed for', voiceId);
        setPlayingVoiceId(null);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing voice preview:', error);
      setPlayingVoiceId(null);
    }
  };

  const filters = [
    { label: 'All', value: 'all' },
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'British', value: 'british' },
    { label: 'American', value: 'american' },
    { label: 'Narration', value: 'narration' },
    { label: 'Conversational', value: 'conversational' },
  ];

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input 
          placeholder="Search voices..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          disabled={disabled}
        />
      </div>
      
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <Button 
            key={f.value}
            size="sm" 
            variant={filter === f.value ? 'default' : 'outline'} 
            onClick={() => setFilter(f.value)}
            disabled={disabled}
            className="text-xs"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Voice grid */}
      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
          {filteredVoices.map(voice => (
            <Card 
              key={voice.voice_id} 
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                selectedVoice?.voice_id === voice.voice_id && "ring-2 ring-primary",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm truncate">{voice.name}</h4>
                      {selectedVoice?.voice_id === voice.voice_id && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
                    {voice.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {voice.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  <Badge variant="secondary" className="text-xs">{voice.gender}</Badge>
                  <Badge variant="secondary" className="text-xs">{voice.accent}</Badge>
                  <Badge variant="secondary" className="text-xs">{voice.use_case}</Badge>
                </div>

                <div className="flex gap-2">
                  {voice.hasPreview === false ? (
                    <div className="flex-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        disabled={true}
                      >
                        <X className="w-3 h-3 mr-1.5" />
                        No Preview
                      </Button>
                      <p className="text-[11px] text-muted-foreground mt-1">Preview not available</p>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreview(voice.voice_id)}
                      className="flex-1 text-xs"
                      disabled={disabled}
                    >
                      {playingVoiceId === voice.voice_id ? (
                        <>
                          <Pause className="w-3 h-3 mr-1.5" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1.5" />
                          Preview
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleSelect(voice)}
                    disabled={disabled || selectedVoice?.voice_id === voice.voice_id}
                    className="text-xs min-w-[88px] whitespace-nowrap shrink-0"
                  >
                    {selectedVoice?.voice_id === voice.voice_id ? 'Selected' : 'Select'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
