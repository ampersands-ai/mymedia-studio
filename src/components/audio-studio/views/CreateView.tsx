import { useState } from 'react';
import { Music, Mic, Volume2, Zap, Scissors, Sparkles, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MoodPills } from '../shared/MoodPills';
import { VoiceCard } from '../shared/VoiceCard';
import { GENRES, MOODS, DURATIONS } from '../data/mock-data';
import { VOICE_DATABASE, type VoiceData } from '@/lib/voice-mapping';
import type { CreateTab, Genre, Mood } from '../types/audio-studio.types';
import { toast } from 'sonner';

interface CreateViewProps {
  initialTab?: CreateTab;
}

export function CreateView({ initialTab = 'song' }: CreateViewProps) {
  const [activeTab, setActiveTab] = useState<CreateTab>(initialTab);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-black text-foreground mb-6">Create</h1>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CreateTab)} className="space-y-6">
        <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
          <TabsTrigger value="song" className="gap-2 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
            <Music className="h-4 w-4" /> Song Generator
          </TabsTrigger>
          <TabsTrigger value="tts" className="gap-2 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
            <Volume2 className="h-4 w-4" /> Text to Speech
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-2 data-[state=active]:bg-primary-orange data-[state=active]:text-black" disabled>
            <Mic className="h-4 w-4" /> Voice Changer
          </TabsTrigger>
          <TabsTrigger value="sfx" className="gap-2 data-[state=active]:bg-primary-orange data-[state=active]:text-black" disabled>
            <Zap className="h-4 w-4" /> Sound Effects
          </TabsTrigger>
          <TabsTrigger value="stems" className="gap-2 data-[state=active]:bg-primary-orange data-[state=active]:text-black" disabled>
            <Scissors className="h-4 w-4" /> Stem Separation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="song"><SongGeneratorTab /></TabsContent>
        <TabsContent value="tts"><TTSTab /></TabsContent>
        <TabsContent value="voice"><ComingSoonTab title="Voice Changer" /></TabsContent>
        <TabsContent value="sfx"><ComingSoonTab title="Sound Effects" /></TabsContent>
        <TabsContent value="stems"><ComingSoonTab title="Stem Separation" /></TabsContent>
      </Tabs>
    </div>
  );
}

function SongGeneratorTab() {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState<Genre | ''>('');
  const [mood, setMood] = useState<Mood | undefined>();
  const [duration, setDuration] = useState(120);
  const [instrumental, setInstrumental] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description for your song');
      return;
    }
    setIsGenerating(true);
    toast.info('Song generation will be connected to Suno API');
    setTimeout(() => setIsGenerating(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <Label htmlFor="prompt">Describe your song</Label>
        <Textarea
          id="prompt"
          placeholder="e.g., 'upbeat pop song about summer love with catchy chorus'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px] bg-card border-border"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">{prompt.length}/500</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Genre</Label>
          <Select value={genre} onValueChange={(v) => setGenre(v as Genre)}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.icon} {g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Duration: {DURATIONS.find(d => d.value === duration)?.label}</Label>
          <Slider
            value={[duration]}
            onValueChange={([v]) => setDuration(v)}
            min={30} max={240} step={30}
            className="mt-3"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Mood</Label>
        <MoodPills moods={MOODS} selectedMood={mood} onSelect={setMood} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="instrumental" checked={instrumental} onCheckedChange={setInstrumental} />
          <Label htmlFor="instrumental">Instrumental Only</Label>
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full h-12 bg-gradient-to-r from-primary-orange to-accent-purple hover:opacity-90 text-black font-bold"
      >
        {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
        {isGenerating ? 'Generating...' : 'Generate Song'}
      </Button>
    </div>
  );
}

function TTSTab() {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceData>(VOICE_DATABASE[0]);
  const [speed, setSpeed] = useState(1);
  const [stability, setStability] = useState(0.5);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!text.trim()) { toast.error('Please enter text'); return; }
    setIsGenerating(true);
    toast.info(`Generating speech with ${selectedVoice.name} voice...`);
    // TODO: Connect to ElevenLabs_TTS execute function
    setTimeout(() => {
      setIsGenerating(false);
      toast.success('Speech generated successfully!');
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Text input */}
      <div className="space-y-2">
        <Label>Text to convert</Label>
        <Textarea
          placeholder="Enter the text you want to convert to speech..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[120px] bg-card border-border"
          maxLength={5000}
        />
        <p className="text-xs text-muted-foreground text-right">{text.length}/5000</p>
      </div>

      {/* Voice selection */}
      <div className="space-y-3">
        <Label>Select Voice</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {VOICE_DATABASE.slice(0, 12).map((voice) => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              isSelected={selectedVoice.voice_id === voice.voice_id}
              onSelect={() => setSelectedVoice(voice)}
              size="sm"
            />
          ))}
        </div>
        
        {/* Show more voices */}
        <Accordion type="single" collapsible>
          <AccordionItem value="more-voices" className="border-none">
            <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-2">
              Show all {VOICE_DATABASE.length} voices
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                {VOICE_DATABASE.slice(12).map((voice) => (
                  <VoiceCard
                    key={voice.voice_id}
                    voice={voice}
                    isSelected={selectedVoice.voice_id === voice.voice_id}
                    onSelect={() => setSelectedVoice(voice)}
                    size="sm"
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Voice settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Speed</Label>
            <span className="text-sm text-muted-foreground">{speed.toFixed(1)}x</span>
          </div>
          <Slider
            value={[speed]}
            onValueChange={([v]) => setSpeed(v)}
            min={0.7}
            max={1.2}
            step={0.1}
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Stability</Label>
            <span className="text-sm text-muted-foreground">{Math.round(stability * 100)}%</span>
          </div>
          <Slider
            value={[stability]}
            onValueChange={([v]) => setStability(v)}
            min={0}
            max={1}
            step={0.05}
          />
          <p className="text-xs text-muted-foreground">Higher = more consistent, lower = more expressive</p>
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !text.trim()}
        className="w-full h-12 bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 text-white font-bold"
      >
        {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Volume2 className="h-5 w-5 mr-2" />}
        {isGenerating ? 'Generating...' : 'Generate Speech'}
      </Button>
    </div>
  );
}

function ComingSoonTab({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">Coming soon! This feature is under development.</p>
    </div>
  );
}
