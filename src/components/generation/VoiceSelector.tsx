import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Check, Search, X, Globe, MapPin } from 'lucide-react';
import { useAudioUrl } from '@/hooks/media';
import { VOICE_DATABASE, VoiceData, getVoiceById } from '@/lib/voice-mapping';
import { useAzureVoices, useAzureVoiceFilters, AzureVoice } from '@/hooks/useAzureVoices';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface VoiceSelectorProps {
  selectedValue: string;              // voice_id for highlighting selected voice
  onSelectVoice: (voiceId: string, voiceName: string) => void;  // Returns both ID and name
  disabled?: boolean;
  showAzureVoices?: boolean;          // Whether to show Azure voices tab (default: false)
  showElevenLabs?: boolean;           // Whether to show ElevenLabs tab (default: true)
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

export function VoiceSelector({ selectedValue, onSelectVoice, disabled, showAzureVoices = false, showElevenLabs = true }: VoiceSelectorProps) {
  const [provider, setProvider] = useState<'elevenlabs' | 'azure'>('azure');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState<string>('English');
  const [countryFilter, setCountryFilter] = useState<string>('United States');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch Azure voices
  const { data: azureVoices, isLoading: azureLoading } = useAzureVoices();
  const { languages, countries } = useAzureVoiceFilters(azureVoices);

  // Get ElevenLabs voices from central database
  const elevenLabsVoices = VOICE_DATABASE;
  
  // Filter ElevenLabs voices
  const filteredElevenLabsVoices = elevenLabsVoices
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
      const aHasPreview = a.hasPreview !== false;
      const bHasPreview = b.hasPreview !== false;
      if (aHasPreview === bHasPreview) return 0;
      return aHasPreview ? -1 : 1;
    });

  // Filter Azure voices
  const filteredAzureVoices = (azureVoices || [])
    .filter(voice => {
      const matchesSearch = voice.voice_name.toLowerCase().includes(search.toLowerCase()) ||
                           voice.language.toLowerCase().includes(search.toLowerCase()) ||
                           voice.country.toLowerCase().includes(search.toLowerCase());
      
      const matchesLanguage = languageFilter === 'all' || voice.language === languageFilter;
      const matchesCountry = countryFilter === 'all' || voice.country === countryFilter;
      
      return matchesSearch && matchesLanguage && matchesCountry;
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
        logger.error('Voice preview playback failed', err, {
          component: 'VoiceSelector',
          voiceId,
          previewUrl: previewUrl?.substring(0, 50)
        });
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
      logger.error('Voice preview initialization failed', error as Error, {
        component: 'VoiceSelector',
        voiceId,
        hasPreviewUrl: !!previewUrl
      });
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

  // Handle Azure voice selection
  const handleAzureSelect = (voice: AzureVoice) => {
    if (disabled) return;
    onSelectVoice(voice.voice_id, voice.voice_name);
  };

  // Single provider mode - show ElevenLabs directly without tabs
  if (showElevenLabs && !showAzureVoices) {
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
            {filteredElevenLabsVoices.map(voice => (
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

  // Multi-provider mode - use tabs
  return (
    <div className="space-y-4">
      <Tabs value={provider} onValueChange={(v) => setProvider(v as 'elevenlabs' | 'azure')}>
        {showElevenLabs && showAzureVoices ? (
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="elevenlabs">ElevenLabs ({elevenLabsVoices.length})</TabsTrigger>
            <TabsTrigger value="azure">Azure Voices ({azureVoices?.length || 0})</TabsTrigger>
          </TabsList>
        ) : showAzureVoices ? (
          <TabsList className="w-full">
            <TabsTrigger value="azure" className="flex-1">Azure Voices ({azureVoices?.length || 0})</TabsTrigger>
          </TabsList>
        ) : null}

        {/* ElevenLabs Tab */}
        {showElevenLabs && <TabsContent value="elevenlabs" className="space-y-4 mt-4">
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
              {filteredElevenLabsVoices.map(voice => (
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
        </TabsContent>}

        {/* Azure Tab - Only show if enabled */}
        {showAzureVoices && (
          <TabsContent value="azure" className="space-y-4 mt-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search by name, language, or country..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              disabled={disabled}
            />
          </div>

          {/* Language and Country Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="w-4 h-4" />
                <span>Language</span>
              </div>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger disabled={disabled}>
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Languages</SelectItem>
                  {languages.map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Country</span>
              </div>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger disabled={disabled}>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {azureLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading voices...</div>
          ) : (
            <>
              {/* Results count */}
              <div className="text-sm text-muted-foreground">
                Showing {filteredAzureVoices.length} of {azureVoices?.length || 0} voices
              </div>

              {/* Voice grid */}
              <ScrollArea className="h-[500px] pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {filteredAzureVoices.map(voice => (
                    <Card 
                      key={voice.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-lg",
                        selectedValue === voice.voice_id && "ring-2 ring-primary",
                        disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm truncate">{voice.voice_name}</h4>
                              {selectedValue === voice.voice_id && (
                                <Check className="w-4 h-4 text-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {voice.country}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          <Badge variant="secondary" className="text-xs">{voice.language}</Badge>
                          <Badge variant="outline" className="text-xs">{voice.language_code}</Badge>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAzureSelect(voice);
                            }}
                            disabled={disabled || selectedValue === voice.voice_id}
                            className="text-xs flex-1"
                          >
                            {selectedValue === voice.voice_id ? 'Selected' : 'Select'}
                          </Button>
                        </div>

                        <div className="mt-2">
                          <p className="text-[10px] text-muted-foreground">
                            💡 Preview uses browser voices. Actual video uses Azure AI voices.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
