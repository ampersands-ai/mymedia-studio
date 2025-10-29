import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Film, Coins, Sparkles, Play, Volume2 } from 'lucide-react';
import { useStoryboard } from '@/hooks/useStoryboard';
import { useUserTokens } from '@/hooks/useUserTokens';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import hyperRealisticImg from '@/assets/styles/hyper-realistic.jpg';
import cinematicImg from '@/assets/styles/cinematic.jpg';
import animatedImg from '@/assets/styles/animated.jpg';
import cartoonImg from '@/assets/styles/cartoon.jpg';
import naturalImg from '@/assets/styles/natural.jpg';
import sketchImg from '@/assets/styles/sketch.jpg';

const VOICES = [
  { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew (US Male)' },
  { id: 'en-US-EmmaMultilingualNeural', name: 'Emma (US Female)' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (UK Male)' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha (AU Female)' },
  { id: 'en-US-BrianNeural', name: 'Brian (US Male)' },
  { id: 'en-US-JennyNeural', name: 'Jenny (US Female)' },
];

const STYLES = [
  {
    value: 'hyper-realistic',
    label: 'Hyper Realistic',
    image: hyperRealisticImg,
    description: 'Ultra-realistic, photo-quality visuals'
  },
  {
    value: 'cinematic',
    label: 'Cinematic',
    image: cinematicImg,
    description: 'Movie-like dramatic lighting & composition'
  },
  {
    value: 'animated',
    label: 'Animated',
    image: animatedImg,
    description: '3D rendered, Pixar-style animation'
  },
  {
    value: 'cartoon',
    label: 'Cartoon',
    image: cartoonImg,
    description: '2D illustrated, playful cartoon style'
  },
  {
    value: 'natural',
    label: 'Natural',
    image: naturalImg,
    description: 'Natural photography, authentic look'
  },
  {
    value: 'sketch',
    label: 'Sketch',
    image: sketchImg,
    description: 'Hand-drawn, artistic pencil sketch'
  },
];

const TONES = [
  { value: 'engaging', label: 'Engaging & Curious' },
  { value: 'educational', label: 'Educational & Informative' },
  { value: 'dramatic', label: 'Dramatic & Intense' },
  { value: 'humorous', label: 'Humorous & Playful' },
  { value: 'mysterious', label: 'Mysterious & Intriguing' },
];

const TOPIC_SUGGESTIONS = [
  'Why octopuses have 3 hearts and blue blood',
  'The science behind lucid dreaming',
  'How ancient pyramids were actually built',
  'The hidden psychology of social media addiction',
  'Why we forget our dreams seconds after waking up',
  'The butterfly effect in quantum physics',
  'How your brain creates false memories',
  'The secret language of dolphins',
  'Why time feels faster as you get older',
  'The truth about the Bermuda Triangle',
  'How honey never expires',
  'The science of déjà vu',
  'Why cats always land on their feet',
  'The mystery of dark matter',
  'How trees communicate underground',
  'The real reason we yawn',
  'Why we get goosebumps',
  'The hidden power of your subconscious mind',
  'How artificial intelligence dreams',
  'The science behind love at first sight',
];

export const StoryboardInput = () => {
  const { generateStoryboard, isGenerating } = useStoryboard();
  const { data: tokenData } = useUserTokens();

  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [style, setStyle] = useState('hyper-realistic');
  const [tone, setTone] = useState('engaging');
  const [voiceID, setVoiceID] = useState(VOICES[0].id);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const estimatedCost = 250;
  const canGenerate = topic.length >= 5 && topic.length <= 500 && (tokenData?.tokens_remaining || 0) >= estimatedCost;

  const handleSurpriseMe = () => {
    const randomTopic = TOPIC_SUGGESTIONS[Math.floor(Math.random() * TOPIC_SUGGESTIONS.length)];
    setTopic(randomTopic);
    toast.success('✨ Random topic selected!');
  };

  const handlePlayVoicePreview = (voiceId: string, voiceName: string) => {
    // Stop any currently playing voice
    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel();
    }

    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voiceId);

    // Create speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(
      'Hello! This is a preview of how your video voiceover will sound. I will narrate your storyboard with this voice.'
    );

    // Try to match voice characteristics
    const voices = window.speechSynthesis.getVoices();
    const genderMatch = voiceName.toLowerCase().includes('male') && !voiceName.toLowerCase().includes('female') ? 'male' : 'female';
    const regionMatch = voiceName.includes('US') ? 'en-US' : voiceName.includes('UK') ? 'en-GB' : voiceName.includes('AU') ? 'en-AU' : 'en-US';
    
    const matchedVoice = voices.find(v => 
      v.lang.includes(regionMatch) && 
      (genderMatch === 'male' ? v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female') : v.name.toLowerCase().includes('female'))
    ) || voices.find(v => v.lang.includes('en'));

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      setPlayingVoice(null);
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      if (topic.length < 5) {
        toast.error('Topic must be at least 5 characters');
      } else if (topic.length > 500) {
        toast.error('Topic must be less than 500 characters');
      } else {
        toast.error('Insufficient tokens');
      }
      return;
    }

    const voiceName = VOICES.find(v => v.id === voiceID)?.name || '';

    await generateStoryboard({
      topic,
      duration,
      style,
      tone,
      voiceID,
      voiceName,
    });
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-xl border-primary/20">
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
      
      <div className="relative p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Film className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black">AI STORYBOARD GENERATOR</h2>
          <p className="text-muted-foreground">
            Describe your topic and let AI create an engaging video script
          </p>
        </div>

        {/* Topic Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="topic" className="text-sm font-semibold">
              Video Topic
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSurpriseMe}
              disabled={isGenerating}
              className="gap-2 h-8 text-xs"
            >
              <Sparkles className="w-3 h-3" />
              Surprise Me
            </Button>
          </div>
          <Textarea
            id="topic"
            placeholder="e.g., Why octopuses have 3 hearts, The science behind lucid dreaming, How ancient pyramids were built..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="min-h-[120px] resize-none bg-background/50"
            maxLength={500}
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{topic.length}/500 characters</span>
            {topic.length < 5 && <span className="text-destructive">Minimum 5 characters</span>}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Video Duration</Label>
          <RadioGroup
            value={duration.toString()}
            onValueChange={(value) => setDuration(Number(value))}
            className="grid grid-cols-4 gap-3"
            disabled={isGenerating}
          >
            {[30, 60, 90, 120].map((d) => (
              <div key={d} className="relative">
                <RadioGroupItem value={d.toString()} id={`duration-${d}`} className="peer sr-only" />
                <Label
                  htmlFor={`duration-${d}`}
                  className={cn(
                    "flex items-center justify-center rounded-lg border-2 border-muted bg-background p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all",
                    "font-semibold"
                  )}
                >
                  {d < 60 ? `${d}s` : `${d / 60}m`}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Style */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Video Style</Label>
          
          <RadioGroup
            value={style}
            onValueChange={setStyle}
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
            disabled={isGenerating}
          >
            {STYLES.map((styleOption) => (
              <div key={styleOption.value} className="relative group">
                <RadioGroupItem 
                  value={styleOption.value} 
                  id={`style-${styleOption.value}`} 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor={`style-${styleOption.value}`}
                  className={cn(
                    "block cursor-pointer rounded-lg overflow-hidden transition-all",
                    "border-2 border-muted hover:border-primary/50",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-4 peer-data-[state=checked]:ring-primary/20",
                    "transform hover:scale-105 active:scale-95"
                  )}
                >
                  {/* Image Container */}
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <img
                      src={styleOption.image}
                      alt={styleOption.label}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                    
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Selected Checkmark */}
                    {style === styleOption.value && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-in zoom-in-50">
                        <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Style Name */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-bold text-sm leading-tight">
                        {styleOption.label}
                      </p>
                      <p className="text-white/70 text-xs mt-0.5 line-clamp-1">
                        {styleOption.description}
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Voice */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Voice Selection
          </Label>
          
          <RadioGroup
            value={voiceID}
            onValueChange={setVoiceID}
            className="space-y-2"
            disabled={isGenerating}
          >
            {VOICES.map((voice) => (
              <div key={voice.id} className="relative group">
                <RadioGroupItem 
                  value={voice.id} 
                  id={`voice-${voice.id}`} 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor={`voice-${voice.id}`}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                    "bg-background/50 hover:bg-accent/50 hover:border-primary/30",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                    "peer-data-[state=checked]:shadow-lg peer-data-[state=checked]:shadow-primary/20"
                  )}
                >
                  {/* Voice Name */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      voiceID === voice.id ? "bg-primary animate-pulse" : "bg-muted"
                    )} />
                    <span className="font-medium text-sm">{voice.name}</span>
                  </div>
                  
                  {/* Play Button */}
                  <Button
                    type="button"
                    size="sm"
                    variant={playingVoice === voice.id ? "default" : "ghost"}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePlayVoicePreview(voice.id, voice.name);
                    }}
                    disabled={isGenerating}
                    className={cn(
                      "gap-2 h-8 px-3",
                      playingVoice === voice.id && "animate-pulse"
                    )}
                  >
                    {playingVoice === voice.id ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        Playing...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Preview
                      </>
                    )}
                  </Button>
                </Label>
              </div>
            ))}
          </RadioGroup>
          
          <p className="text-xs text-muted-foreground mt-2">
            💡 Click "Preview" to hear each voice. Note: Preview uses browser voices (actual video uses Azure AI).
          </p>
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Tone</Label>
          <Select value={tone} onValueChange={setTone} disabled={isGenerating}>
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Token Cost */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold">Cost:</span>
            <span className="text-sm text-muted-foreground">{estimatedCost} tokens</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Balance: <span className="font-semibold text-foreground">{tokenData?.tokens_remaining || 0}</span>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full h-12 text-lg font-bold bg-gradient-to-r from-primary via-primary to-primary/80 hover:scale-105 transition-transform"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating Storyboard...
            </>
          ) : (
            <>
              Generate Storyboard
              <Film className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>

        {isGenerating && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="font-medium">🎨 Researching topic...</span>
            </div>
            <div className="flex items-center gap-3 text-sm opacity-70">
              <div className="w-4 h-4" />
              <span className="font-medium">✍️ Writing scenes...</span>
            </div>
            <div className="flex items-center gap-3 text-sm opacity-50">
              <div className="w-4 h-4" />
              <span className="font-medium">🎬 Building storyboard...</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};