import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { useUserTokens } from '@/hooks/useUserTokens';
import { Loader2, Coins } from 'lucide-react';

export function VideoCreator() {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(60);
  const [style, setStyle] = useState('modern');
  const { createJob, isCreating } = useVideoJobs();
  const { data: tokens } = useUserTokens();

  const handleCreate = async () => {
    if (!topic.trim()) {
      return;
    }

    createJob.mutate({
      topic: topic.trim(),
      duration,
      style: style as any,
    });

    // Reset form on success
    setTopic('');
    setDuration(60);
    setStyle('modern');
  };

  const canAfford = (tokens?.tokens_remaining ?? 0) >= 15;

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
          <Label htmlFor="topic" className="text-sm font-bold">
            Video Topic *
          </Label>
          <Input
            id="topic"
            placeholder="e.g., Top 5 AI tools for productivity in 2025"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={500}
            disabled={isCreating}
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
            disabled={isCreating}
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
          <Select value={style} onValueChange={setStyle} disabled={isCreating}>
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
          disabled={isCreating || !topic.trim() || !canAfford}
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
