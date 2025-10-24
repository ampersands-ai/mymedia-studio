import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { useUserTokens } from '@/hooks/useUserTokens';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Coins, Sparkles, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { VoiceBrowser } from './VoiceBrowser';

export function VideoCreator() {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(60);
  const [style, setStyle] = useState('modern');
  const [voiceId, setVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  const [voiceName, setVoiceName] = useState('Rachel');
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const { createJob, isCreating } = useVideoJobs();
  const { data: tokens } = useUserTokens();

  const handleSurpriseMe = async () => {
    setIsGeneratingTopic(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-topic');
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      if (data.topic) {
        setTopic(data.topic);
        toast.success('✨ Creative topic generated!');
      }
    } catch (error: any) {
      console.error('Error generating topic:', error);
      toast.error(error.message || 'Failed to generate topic');
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const handleSelectVoice = (id: string, name: string) => {
    setVoiceId(id);
    setVoiceName(name);
    setVoiceDialogOpen(false);
    toast.success(`Voice changed to ${name}`);
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
    });

    // Reset form on success
    setTopic('');
    setDuration(60);
    setStyle('modern');
    setVoiceId('21m00Tcm4TlvDq8ikWAM');
    setVoiceName('Rachel');
  };

  const canAfford = (tokens?.tokens_remaining ?? 0) >= 15;
  const isDisabled = isCreating || isGeneratingTopic;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-2xl font-black">CREATE FACELESS VIDEO</CardTitle>
        <CardDescription>
          Generate professional videos with AI in minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="topic" className="text-sm font-bold">
              Video Topic *
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSurpriseMe}
              disabled={isDisabled}
              className="h-8"
            >
              {isGeneratingTopic ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-3 w-3" />
                  Surprise Me
                </>
              )}
            </Button>
          </div>
          <Input
            id="topic"
            placeholder="e.g., Top 5 AI tools for productivity in 2025"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={500}
            disabled={isDisabled}
          />
          <p className="text-xs text-muted-foreground">
            {topic.length}/500 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration" className="text-sm font-bold">
            Duration: {duration} seconds
          </Label>
          <Slider
            id="duration"
            min={30}
            max={90}
            step={5}
            value={[duration]}
            onValueChange={(value) => setDuration(value[0])}
            disabled={isDisabled}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Recommended: 60 seconds for optimal engagement
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
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Choose a Voice</DialogTitle>
              </DialogHeader>
              <VoiceBrowser
                selectedVoiceId={voiceId}
                onSelectVoice={handleSelectVoice}
              />
            </DialogContent>
          </Dialog>
          <p className="text-xs text-muted-foreground">
            Browse and preview professional AI voices
          </p>
        </div>

        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <span className="font-bold">Cost: 15 tokens</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Balance: {tokens?.tokens_remaining ?? 0} tokens
            </div>
          </div>
          {!canAfford && (
            <p className="mt-2 text-sm text-destructive font-medium">
              Insufficient tokens. Please purchase more to continue.
            </p>
          )}
        </div>

        <Button 
          onClick={handleCreate} 
          disabled={isDisabled || !topic.trim() || !canAfford}
          className="w-full h-12 text-lg font-bold"
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
