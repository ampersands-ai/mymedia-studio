import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, Check, Search, X } from 'lucide-react';
import { useAudioUrl } from '@/hooks/media';
import { VOICE_DATABASE, VoiceData, getVoiceById, getVoiceByName } from '@/lib/voice-mapping';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceSelectorProps {
  selectedValue: string;              // voice_id for highlighting selected voice
  onSelectVoice: (voiceId: string, voiceName: string) => void;  // Returns both ID and name
  disabled?: boolean;
}

interface VoiceCardProps {
  voice: VoiceData;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: (voice: VoiceData) => void;
  onPreview: (url: string | null, voiceId: string) => void;
  disabled: boolean;
}

const VoiceCard = ({ voice, isSelected, isPlaying, onSelect, onPreview, disabled }: VoiceCardProps) => {
  const { url: previewUrl, isLoading, error } = useAudioUrl(
    voice.hasPreview !== false ? `${voice.voice_id}.mp3` : null,
    {
      strategy: 'signed-short',
      bucket: 'voice-previews'
    }
  );

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg",
        isSelected && "ring-2 ring-primary",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{voice.name}</h4>
              {isSelected && (
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
              onClick={(e) => {
                e.stopPropagation();
                onPreview(previewUrl, voice.voice_id);
              }}
              className="flex-1 text-xs"
              disabled={disabled || isLoading || error}
            >
              {isLoading ? (
                'Loading...'
              ) : error ? (
                <>
                  <X className="w-3 h-3 mr-1.5" />
                  Unavailable
                </>
              ) : isPlaying ? (
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
            onClick={(e) => {
              e.stopPropagation();
              onSelect(voice);
            }}
            disabled={disabled || isSelected}
            className="text-xs min-w-[80px] whitespace-nowrap shrink-0"
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export function VoiceSelector({ selectedValue, onSelectVoice, disabled }: VoiceSelectorProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get all voices from central database
  const voices = VOICE_DATABASE;
  
  // Filter logic based on search and filters, then sort by preview availability
  const filteredVoices = voices
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

  // Determine selected voice by ID
  const selectedVoice = getVoiceById(selectedValue);

  const handleSelect = (voice: VoiceData) => {
    if (disabled) return;
    onSelectVoice(voice.voice_id, voice.name);
  };

  // Audio preview with signed URLs
  const handlePreview = (previewUrl: string | null, voiceId: string) => {
    if (!previewUrl) {
      toast.error('Preview not available', {
        description: 'This voice preview is still being processed.'
      });
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (playingVoiceId === voiceId) {
        setPlayingVoiceId(null);
        return;
      }

      const audio = new Audio(previewUrl);
      
      audio.play().catch(err => {
        console.error('Error playing audio preview:', err);
        toast.error('Playback error', {
          description: 'Failed to play audio preview.'
        });
      });

      audioRef.current = audio;
      setPlayingVoiceId(voiceId);

      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };
    } catch (error) {
      console.error('Error in handlePreview:', error);
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
      <ScrollArea className="h-[500px] pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
          {filteredVoices.map(voice => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              isSelected={selectedVoice?.voice_id === voice.voice_id}
              isPlaying={playingVoiceId === voice.voice_id}
              onSelect={handleSelect}
              onPreview={handlePreview}
              disabled={disabled || false}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
