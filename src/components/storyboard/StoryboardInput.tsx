import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useStoryboard } from '@/hooks/useStoryboard';
import { useUserTokens } from '@/hooks/useUserTokens';
import { Sparkles, Film, Coins, Volume2, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const VOICES = [
  { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew (US Male)' },
  { id: 'en-US-EmmaMultilingualNeural', name: 'Emma (US Female)' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (UK Male)' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha (AU Female)' },
  { id: 'en-US-BrianNeural', name: 'Brian (US Male)' },
  { id: 'en-US-JennyNeural', name: 'Jenny (US Female)' },
];

const STYLES = [
  { value: 'hyper-realistic', label: 'Hyper Realistic', emoji: '📷' },
  { value: 'cinematic', label: 'Cinematic', emoji: '🎬' },
  { value: 'animated', label: 'Animated', emoji: '✨' },
  { value: 'cartoon', label: 'Cartoon', emoji: '🎨' },
  { value: 'natural', label: 'Natural', emoji: '🍃' },
  { value: 'sketch', label: 'Sketch', emoji: '✏️' },
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

export function StoryboardInput() {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(60);
  const [style, setStyle] = useState('hyper-realistic');
  const [tone, setTone] = useState('engaging');
  const [voiceID, setVoiceID] = useState('en-US-AndrewMultilingualNeural');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);

  const { generateStoryboard, isGenerating } = useStoryboard();
  const { data: tokenData } = useUserTokens();

  const estimatedCost = 250;
  const canGenerate = topic.length >= 5 && topic.length <= 500 && (tokenData?.tokens_remaining || 0) >= estimatedCost;

  const handleSurpriseMe = () => {
    const randomTopic = TOPIC_SUGGESTIONS[Math.floor(Math.random() * TOPIC_SUGGESTIONS.length)];
    setTopic(randomTopic);
    toast.success('✨ Random topic selected!');
  };

  const handlePlayVoicePreview = (voiceId: string, voiceName: string) => {
    if (playingVoice === voiceId) {
      window.speechSynthesis.cancel();
      setPlayingVoice(null);
      return;
    }

    window.speechSynthesis.cancel();
    setPlayingVoice(voiceId);

    const utterance = new SpeechSynthesisUtterance(
      'Hello! This is a preview of how your video voiceover will sound. I will narrate your storyboard with this voice.'
    );

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
    utterance.onend = () => setPlayingVoice(null);

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
    <Card className="relative overflow-hidden bg-card border-2">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl font-black flex items-center gap-2">
          <Film className="w-5 h-5" />
          CREATE STORYBOARD
        </CardTitle>
        <CardDescription className="text-sm">
          Generate AI-powered video scripts with full editing control
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Topic Input */}
        <div className="space-y-2">
          <Label htmlFor="topic" className="text-sm font-medium">
            Video Topic *
          </Label>
          <Textarea
            id="topic"
            placeholder="e.g., 'The Science Behind Dreams' or 'Top 5 Ancient Civilizations'"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="min-h-[80px] resize-none"
            disabled={isGenerating}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSurpriseMe}
            disabled={isGenerating}
            className="gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Surprise Me
          </Button>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Video Duration</Label>
          <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))} disabled={isGenerating}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 seconds (~4 scenes)</SelectItem>
              <SelectItem value="60">60 seconds (~8 scenes)</SelectItem>
              <SelectItem value="90">90 seconds (~12 scenes)</SelectItem>
              <SelectItem value="120">120 seconds (~16 scenes)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Style */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Video Style</Label>
          <Select value={style} onValueChange={setStyle} disabled={isGenerating}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STYLES.map((styleOption) => (
                <SelectItem key={styleOption.value} value={styleOption.value}>
                  {styleOption.emoji} {styleOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Voiceover</Label>
          <Dialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start" disabled={isGenerating}>
                <Volume2 className="w-4 h-4 mr-2" />
                {VOICES.find(v => v.id === voiceID)?.name}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Choose a Voice</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {VOICES.map((voice) => (
                  <div
                    key={voice.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all",
                      voiceID === voice.id
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-primary/50 hover:bg-accent/50"
                    )}
                    onClick={() => {
                      setVoiceID(voice.id);
                      setVoiceDialogOpen(false);
                    }}
                  >
                    <span className="font-medium text-sm">{voice.name}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayVoicePreview(voice.id, voice.name);
                      }}
                      className="gap-2"
                    >
                      {playingVoice === voice.id ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          Playing
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Preview
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Preview uses browser voices. Actual video uses Azure AI voices.
              </p>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label htmlFor="tone" className="text-sm font-medium">Tone & Style</Label>
          <Select value={tone} onValueChange={setTone} disabled={isGenerating}>
            <SelectTrigger id="tone">
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

        {/* Token Cost Display */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border">
          <div className="flex items-center gap-2 text-sm">
            <Coins className="w-4 h-4 text-primary" />
            <span>Cost: <span className="font-bold">{estimatedCost}</span> tokens</span>
          </div>
          <span className="text-sm">
            Balance: <span className="font-bold">{tokenData?.tokens_remaining || 0}</span>
          </span>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              Generate Storyboard
              <Film className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {/* Generation Status */}
        {isGenerating && (
          <p className="text-sm text-center text-muted-foreground">
            ✨ AI is crafting your video script...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
