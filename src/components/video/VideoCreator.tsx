import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { useUserTokens } from '@/hooks/useUserTokens';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Coins, Sparkles, Volume2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { VoiceSelector } from '../generation/VoiceSelector';
import { BackgroundMediaSelector } from './BackgroundMediaSelector';
import { captionPresets, aspectRatioConfig } from '@/config/captionStyles';

export function VideoCreator() {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(60);
  const [style, setStyle] = useState('modern');
  const [voiceId, setVoiceId] = useState('nPczCjzI2devNBz1zQrb');
  const [voiceName, setVoiceName] = useState('Brian');
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '4:5' | '1:1'>('4:5');
  const [captionStyle, setCaptionStyle] = useState<string>('modern');
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState<string>('');
  const [backgroundThumbnail, setBackgroundThumbnail] = useState<string>('');
  const [backgroundMediaType, setBackgroundMediaType] = useState<'video' | 'image'>('video');
  const { createJob, isCreating, jobs } = useVideoJobs();
  const { data: tokens } = useUserTokens();

  const handleSurpriseMe = async () => {
    setIsGeneratingTopic(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-topic');
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      if (data.topic) {
        setTopic(data.topic);
      }
    } catch (error: any) {
      console.error('Error generating topic:', error);
      toast.error(error.message || 'Failed to generate topic');
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const handleSelectVoice = (voiceId: string, voiceName: string) => {
    setVoiceId(voiceId);
    setVoiceName(voiceName);
    setVoiceDialogOpen(false);
  };

  const handleCreate = async () => {
    if (!topic.trim()) {
      return;
    }

    createJob.mutate({
      topic: topic.trim(),
      duration,
      style: style as any,
      voice_id: voiceId,
      voice_name: voiceName,
      aspect_ratio: aspectRatio,
      background_video_url: backgroundVideoUrl || undefined,
      background_video_thumbnail: backgroundThumbnail || undefined,
      background_media_type: backgroundMediaType,
      caption_style: captionPresets[captionStyle],
    });

    // Reset form on success
    setTopic('');
    setDuration(60);
    setStyle('modern');
    setVoiceId('21m00Tcm4TlvDq8ikWAM');
    setVoiceName('Rachel');
    setAspectRatio('4:5');
    setCaptionStyle('modern');
    setBackgroundVideoUrl('');
    setBackgroundThumbnail('');
    setBackgroundMediaType('video');
  };

  const hasActiveJob = jobs?.some(job => 
    ['pending', 'generating_script', 'awaiting_script_approval', 
     'generating_voice', 'awaiting_voice_approval', 
     'fetching_video', 'assembling'].includes(job.status)
  );

  const canAfford = (tokens?.tokens_remaining ?? 0) >= 15;
  const isDisabled = isCreating || isGeneratingTopic || hasActiveJob;

  return (
    <Card className="border-2 w-full overflow-hidden">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl sm:text-2xl font-black break-words">
          CREATE FACELESS VIDEO
        </CardTitle>
        <CardDescription className="text-sm">
          Generate professional videos with AI in minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6 min-w-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Label htmlFor="topic" className="text-sm font-bold">
              Video Topic *
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSurpriseMe}
              disabled={isDisabled}
              className="h-8 text-xs"
            >
              {isGeneratingTopic ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3 w-3" />
                  Surprise Me
                </>
              )}
            </Button>
          </div>
          <Input
            id="topic"
            placeholder="e.g., Top 5 AI tools for productivity"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={500}
            disabled={isDisabled}
            className="text-sm w-full min-w-0"
          />
          <p className="text-xs text-muted-foreground">
            {topic.length}/500 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration" className="text-sm font-bold">
            Duration: {duration} seconds
          </Label>
          <div className="overflow-x-hidden px-1">
            <Slider
              id="duration"
              min={10}
              max={180}
              step={5}
              value={[duration]}
              onValueChange={(value) => setDuration(value[0])}
              disabled={isDisabled}
              className="w-full max-w-full"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Approximate only: final length of the video to be determined by the audio time (1s = 12 tokens)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="style" className="text-sm font-bold">
            Video Style
          </Label>
          <Select value={style} onValueChange={setStyle} disabled={isDisabled}>
            <SelectTrigger id="style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modern">🎨 Modern - Clean & Professional</SelectItem>
              <SelectItem value="tech">💻 Tech - Futuristic & Digital</SelectItem>
              <SelectItem value="educational">📚 Educational - Learning Focused</SelectItem>
              <SelectItem value="dramatic">🎬 Dramatic - Cinematic & Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">
            Voiceover
          </Label>
          <Dialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                disabled={isDisabled}
              >
                <Volume2 className="w-4 h-4 mr-2" />
                {voiceName}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-4xl flex flex-col max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Choose a Voice</DialogTitle>
              </DialogHeader>
              <VoiceSelector
                selectedValue={voiceId}
                onSelectVoice={handleSelectVoice}
              />
            </DialogContent>
          </Dialog>
          <p className="text-xs text-muted-foreground">
            Browse and preview professional AI voices (powered by ElevenLabs)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aspectRatio" className="text-sm font-bold">
            Aspect Ratio
          </Label>
          <Select value={aspectRatio} onValueChange={(value: any) => setAspectRatio(value)} disabled={isDisabled}>
            <SelectTrigger id="aspectRatio">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(aspectRatioConfig).map(([ratio, config]) => (
                <SelectItem key={ratio} value={ratio}>
                  {config.label} ({ratio})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose the format for your target platform
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="captionStyle" className="text-sm font-bold">
            Caption Style
          </Label>
          <Select value={captionStyle} onValueChange={setCaptionStyle} disabled={isDisabled}>
            <SelectTrigger id="captionStyle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modern">Modern (Large, Bold, Centered)</SelectItem>
              <SelectItem value="minimal">Minimal (Bottom, Clean)</SelectItem>
              <SelectItem value="bold">Bold (Gold, Impact Font)</SelectItem>
              <SelectItem value="elegant">Elegant (Serif, Bottom)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Animated word-by-word captions
          </p>
        </div>

        <BackgroundMediaSelector
          style={style}
          duration={duration}
          aspectRatio={aspectRatio}
          selectedMediaUrl={backgroundVideoUrl}
          selectedMediaType={backgroundMediaType}
          onSelectMedia={(url, thumbnail, type) => {
            setBackgroundVideoUrl(url);
            setBackgroundThumbnail(thumbnail);
            setBackgroundMediaType(type);
          }}
        />

        {hasActiveJob && (
          <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertTitle className="text-orange-900 dark:text-orange-100">
              Generation In Progress
            </AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-200 text-sm">
              Please wait for your current video to complete or fail before creating a new one. 
              Check "Current Generation" section below for status.
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3 md:p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span className="font-bold text-sm md:text-base">Cost: 15 tokens</span>
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">
              Balance: {tokens?.tokens_remaining ?? 0} tokens
            </div>
          </div>
          {!canAfford && (
            <p className="mt-2 text-xs md:text-sm text-destructive font-medium">
              Insufficient tokens. Please purchase more to continue.
            </p>
          )}
        </div>

        <Button 
          onClick={handleCreate} 
          disabled={isDisabled || !topic.trim() || !canAfford}
          className="w-full h-11 md:h-12 text-base md:text-lg font-bold"
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
              Creating Video...
            </>
          ) : (
            <>
              🎬 Create Video (15 tokens)
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Generation takes 3-5 minutes</p>
          <p>• AI generates script, voiceover, and assembles video</p>
          <p>• You'll be notified when complete</p>
        </div>
      </CardContent>
    </Card>
  );
}
