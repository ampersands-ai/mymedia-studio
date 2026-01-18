import { useState, useRef } from 'react';
import { Music, Mic, Volume2, Zap, Scissors, Sparkles, Loader2, Upload, FileAudio } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MoodPills } from '../shared/MoodPills';
import { VoiceCard } from '../shared/VoiceCard';
import { GENRES, MOODS, DURATIONS, SFX_CATEGORIES } from '../data/mock-data';
import { VOICE_DATABASE, type VoiceData } from '@/lib/voice-mapping';
import type { CreateTab, Genre, Mood, AudioTrack } from '../types/audio-studio.types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioGeneration, type TTSQuality } from '../hooks/useAudioGeneration';
import { useAudioPlayer } from '../hooks/useAudioStudioPlayer';

interface CreateViewProps {
  initialTab?: CreateTab;
}

export function CreateView({ initialTab = 'song' }: CreateViewProps) {
  const [activeTab, setActiveTab] = useState<CreateTab>(initialTab);
  const { user } = useAuth();
  const audioGeneration = useAudioGeneration();
  const { play } = useAudioPlayer();

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-black text-foreground mb-6">Create</h1>
      
      {/* Global generation progress indicator */}
      {audioGeneration.isGenerating && (
        <div className="mb-6 p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary-orange" />
            <span className="text-sm font-medium">{audioGeneration.currentStep}</span>
          </div>
          <Progress value={audioGeneration.progress} className="h-2" />
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CreateTab)} className="space-y-6">
        <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
          <TabsTrigger value="song" className="gap-2 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
            <Music className="h-4 w-4" /> Song Generator
          </TabsTrigger>
          <TabsTrigger value="tts" className="gap-2 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
            <Volume2 className="h-4 w-4" /> Text to Speech
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-2 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
            <Mic className="h-4 w-4" /> Voice Changer
          </TabsTrigger>
          <TabsTrigger value="sfx" className="gap-2 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
            <Zap className="h-4 w-4" /> Sound Effects
          </TabsTrigger>
          <TabsTrigger value="stems" className="gap-2 data-[state=active]:bg-primary-orange data-[state=active]:text-black">
            <Scissors className="h-4 w-4" /> Stem Separation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="song">
          <SongGeneratorTab userId={user?.id} audioGeneration={audioGeneration} onTrackGenerated={(track) => { play(track); }} />
        </TabsContent>
        <TabsContent value="tts">
          <TTSTab userId={user?.id} audioGeneration={audioGeneration} onTrackGenerated={(track) => { play(track); }} />
        </TabsContent>
        <TabsContent value="voice"><VoiceChangerTab /></TabsContent>
        <TabsContent value="sfx">
          <SFXTab userId={user?.id} audioGeneration={audioGeneration} onTrackGenerated={(track) => { play(track); }} />
        </TabsContent>
        <TabsContent value="stems"><StemSeparationTab /></TabsContent>
      </Tabs>
    </div>
  );
}

interface GeneratorTabProps {
  userId?: string;
  audioGeneration: ReturnType<typeof useAudioGeneration>;
  onTrackGenerated: (track: AudioTrack) => void;
}

function SongGeneratorTab({ userId, audioGeneration, onTrackGenerated }: GeneratorTabProps) {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState<Genre | ''>('');
  const [mood, setMood] = useState<Mood | undefined>();
  const [duration, setDuration] = useState(120);
  const [instrumental, setInstrumental] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description for your song');
      return;
    }
    if (!userId) {
      toast.error('Please sign in to generate music');
      return;
    }

    const track = await audioGeneration.generateMusic({
      prompt,
      genre: genre || undefined,
      mood,
      duration,
      instrumental,
    }, userId);

    if (track) {
      onTrackGenerated(track);
      setPrompt('');
    }
  };

  const isGenerating = audioGeneration.isGenerating;

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
          disabled={isGenerating}
        />
        <p className="text-xs text-muted-foreground text-right">{prompt.length}/500</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Genre</Label>
          <Select value={genre} onValueChange={(v) => setGenre(v as Genre)} disabled={isGenerating}>
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
            disabled={isGenerating}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Mood</Label>
        <MoodPills moods={MOODS} selectedMood={mood} onSelect={setMood} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="instrumental" checked={instrumental} onCheckedChange={setInstrumental} disabled={isGenerating} />
          <Label htmlFor="instrumental">Instrumental Only</Label>
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim() || !userId}
        className="w-full h-12 bg-gradient-to-r from-primary-orange to-accent-purple hover:opacity-90 text-black font-bold"
      >
        {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
        {isGenerating ? 'Generating...' : 'Generate Song'}
      </Button>
    </div>
  );
}

function TTSTab({ userId, audioGeneration, onTrackGenerated }: GeneratorTabProps) {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceData>(VOICE_DATABASE[0]);
  const [speed, setSpeed] = useState(1);
  const [stability, setStability] = useState(0.5);
  const [quality, setQuality] = useState<TTSQuality>('fast');

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('Please enter text');
      return;
    }
    if (!userId) {
      toast.error('Please sign in to generate speech');
      return;
    }

    const track = await audioGeneration.generateTTS({
      text,
      voice: selectedVoice.name,
      quality,
      speed,
      stability,
      similarityBoost: 0.75,
    }, userId);

    if (track) {
      onTrackGenerated(track);
      setText('');
    }
  };

  const isGenerating = audioGeneration.isGenerating;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-2">
        <Label>Text to convert</Label>
        <Textarea
          placeholder="Enter the text you want to convert to speech..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[120px] bg-card border-border"
          maxLength={5000}
          disabled={isGenerating}
        />
        <p className="text-xs text-muted-foreground text-right">{text.length}/5000</p>
      </div>

      {/* Quality Tier Selection */}
      <div className="space-y-3">
        <Label>Quality</Label>
        <div className="flex gap-3">
          <Button
            variant={quality === 'fast' ? 'default' : 'outline'}
            onClick={() => setQuality('fast')}
            disabled={isGenerating}
            className={cn(quality === 'fast' && 'bg-primary-orange text-black hover:bg-primary-orange/90')}
          >
            <Zap className="h-4 w-4 mr-2" />
            Fast (3 credits)
          </Button>
          <Button
            variant={quality === 'pro' ? 'default' : 'outline'}
            onClick={() => setQuality('pro')}
            disabled={isGenerating}
            className={cn(quality === 'pro' && 'bg-accent-purple text-white hover:bg-accent-purple/90')}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Pro (6 credits)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {quality === 'fast' ? 'Turbo V2.5 - Fast generation with language support' : 'Multilingual V2 - Highest quality, 29 languages'}
        </p>
      </div>

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
            disabled={isGenerating}
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
            disabled={isGenerating}
          />
          <p className="text-xs text-muted-foreground">Higher = more consistent, lower = more expressive</p>
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !text.trim() || !userId}
        className="w-full h-12 bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 text-white font-bold"
      >
        {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Volume2 className="h-5 w-5 mr-2" />}
        {isGenerating ? 'Generating...' : 'Generate Speech'}
      </Button>
    </div>
  );
}

function VoiceChangerTab() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceData>(VOICE_DATABASE[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }
      setFile(selectedFile);
      toast.success(`Selected: ${selectedFile.name}`);
    }
  };

  const handleProcess = () => {
    if (!file) {
      toast.error('Please upload an audio file');
      return;
    }
    setIsProcessing(true);
    toast.info(`Converting voice to ${selectedVoice.name}...`);
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Voice conversion complete!');
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* File Upload */}
      <Card
        className={cn(
          'border-2 border-dashed p-8 cursor-pointer transition-colors hover:border-primary-orange/50',
          file ? 'border-primary-orange bg-primary-orange/5' : 'border-border'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3 text-center">
          {file ? (
            <>
              <FileAudio className="h-12 w-12 text-primary-orange" />
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button variant="outline" size="sm">Change File</Button>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Upload Audio File</p>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to select (MP3, WAV, M4A up to 50MB)
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Target Voice Selection */}
      <div className="space-y-3">
        <Label>Target Voice</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {VOICE_DATABASE.slice(0, 8).map((voice) => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              isSelected={selectedVoice.voice_id === voice.voice_id}
              onSelect={() => setSelectedVoice(voice)}
              size="sm"
            />
          ))}
        </div>
      </div>

      <Button
        onClick={handleProcess}
        disabled={isProcessing || !file}
        className="w-full h-12 bg-gradient-to-r from-accent-purple to-primary-orange hover:opacity-90 text-black font-bold"
      >
        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Mic className="h-5 w-5 mr-2" />}
        {isProcessing ? 'Processing...' : 'Convert Voice'}
      </Button>
    </div>
  );
}

function SFXTab({ userId, audioGeneration, onTrackGenerated }: GeneratorTabProps) {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState(5);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the sound effect');
      return;
    }
    if (!userId) {
      toast.error('Please sign in to generate sound effects');
      return;
    }

    const track = await audioGeneration.generateSFX({
      prompt,
      category: category || undefined,
      duration,
    }, userId);

    if (track) {
      onTrackGenerated(track);
      setPrompt('');
    }
  };

  const isGenerating = audioGeneration.isGenerating;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <Label>Describe the sound effect</Label>
        <Textarea
          placeholder="e.g., 'futuristic laser gun blast with echo', 'rain falling on a tin roof'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px] bg-card border-border"
          maxLength={300}
          disabled={isGenerating}
        />
        <p className="text-xs text-muted-foreground text-right">{prompt.length}/300</p>
      </div>

      {/* Category Selection */}
      <div className="space-y-3">
        <Label>Category (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {SFX_CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              variant={category === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(category === cat.value ? '' : cat.value)}
              disabled={isGenerating}
              className={cn(
                'gap-1.5',
                category === cat.value && 'bg-primary-orange text-black hover:bg-primary-orange/90'
              )}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Label>Duration</Label>
          <span className="text-sm text-muted-foreground">{duration}s</span>
        </div>
        <Slider
          value={[duration]}
          onValueChange={([v]) => setDuration(v)}
          min={1}
          max={10}
          step={1}
          disabled={isGenerating}
        />
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim() || !userId}
        className="w-full h-12 bg-gradient-to-r from-primary-yellow to-primary-orange hover:opacity-90 text-black font-bold"
      >
        {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Zap className="h-5 w-5 mr-2" />}
        {isGenerating ? 'Generating...' : 'Generate SFX'}
      </Button>
    </div>
  );
}

function StemSeparationTab() {
  const [file, setFile] = useState<File | null>(null);
  const [stems, setStems] = useState({ vocals: true, drums: true, bass: true, other: true });
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }
      setFile(selectedFile);
      toast.success(`Selected: ${selectedFile.name}`);
    }
  };

  const handleProcess = () => {
    if (!file) {
      toast.error('Please upload an audio file');
      return;
    }
    const selectedStems = Object.entries(stems).filter(([, v]) => v).map(([k]) => k);
    if (selectedStems.length === 0) {
      toast.error('Please select at least one stem');
      return;
    }
    setIsProcessing(true);
    toast.info(`Separating ${selectedStems.join(', ')}...`);
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Stem separation complete!');
    }, 4000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* File Upload */}
      <Card
        className={cn(
          'border-2 border-dashed p-8 cursor-pointer transition-colors hover:border-accent-purple/50',
          file ? 'border-accent-purple bg-accent-purple/5' : 'border-border'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3 text-center">
          {file ? (
            <>
              <FileAudio className="h-12 w-12 text-accent-purple" />
              <div>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button variant="outline" size="sm">Change File</Button>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Upload Audio File</p>
                <p className="text-sm text-muted-foreground">
                  Upload a song to separate into stems (up to 100MB)
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Stem Selection */}
      <div className="space-y-3">
        <Label>Select Stems to Extract</Label>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(stems).map(([stem, enabled]) => (
            <Card
              key={stem}
              className={cn(
                'p-4 cursor-pointer transition-colors',
                enabled ? 'border-accent-purple bg-accent-purple/10' : 'border-border hover:border-muted-foreground'
              )}
              onClick={() => setStems(prev => ({ ...prev, [stem]: !prev[stem as keyof typeof stems] }))}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold',
                  enabled ? 'bg-accent-purple text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {stem[0].toUpperCase()}
                </div>
                <span className="font-medium capitalize">{stem}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Button
        onClick={handleProcess}
        disabled={isProcessing || !file}
        className="w-full h-12 bg-gradient-to-r from-accent-purple to-accent-pink hover:opacity-90 text-white font-bold"
      >
        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Scissors className="h-5 w-5 mr-2" />}
        {isProcessing ? 'Separating...' : 'Separate Stems'}
      </Button>
    </div>
  );
}
