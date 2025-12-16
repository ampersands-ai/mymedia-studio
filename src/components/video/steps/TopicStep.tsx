import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, Info, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface TopicStepProps {
  topic: string;
  duration: number;
  style: string;
  onTopicChange: (topic: string) => void;
  onDurationChange: (duration: number) => void;
  onStyleChange: (style: string) => void;
  onGenerateScript: () => void;
  isGenerating: boolean;
  isDisabled: boolean;
  availableCredits: number;
}

export function TopicStep({
  topic,
  duration,
  style,
  onTopicChange,
  onDurationChange,
  onStyleChange,
  onGenerateScript,
  isGenerating,
  isDisabled,
  availableCredits,
}: TopicStepProps) {
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);

  // Calculate approximate cost based on duration (0.3 credits per second)
  const estimatedCost = (duration * 0.3).toFixed(1);
  const canAfford = availableCredits >= duration * 0.3;

  const handleSurpriseMe = async () => {
    setIsGeneratingTopic(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-topic');

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.topic) {
        onTopicChange(data.topic);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error generating topic', err, {
        component: 'TopicStep',
        operation: 'generateTopic',
      });
      toast.error(err.message);
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.round(seconds / 60);
    return `${seconds}s (~${mins} min${mins !== 1 ? 's' : ''})`;
  };

  return (
    <div className="space-y-4">
      {/* Topic Input */}
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
            disabled={isDisabled || isGeneratingTopic}
            className="h-9 text-xs min-h-[44px] sm:min-h-0"
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
          onChange={(e) => onTopicChange(e.target.value)}
          maxLength={500}
          disabled={isDisabled}
          className="text-sm w-full min-h-[44px]"
        />
        <p className="text-xs text-muted-foreground">
          {topic.length}/500 characters
        </p>
      </div>

      {/* Duration Slider */}
      <div className="space-y-2">
        <Label htmlFor="duration" className="text-sm font-bold">
          Duration: {formatDuration(duration)}
        </Label>
        <div className="overflow-x-hidden px-1">
          <Slider
            id="duration"
            min={15}
            max={600}
            step={5}
            value={[duration]}
            onValueChange={(value) => onDurationChange(value[0])}
            disabled={isDisabled}
            className="w-full max-w-full"
          />
        </div>
      </div>

      {/* Story Tone */}
      <div className="space-y-2">
        <Label htmlFor="style" className="text-sm font-bold">
          Story Tone
        </Label>
        <Select value={style} onValueChange={onStyleChange} disabled={isDisabled}>
          <SelectTrigger id="style" className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="educational">📚 Educational - Informative & Clear</SelectItem>
            <SelectItem value="storytelling">📖 Storytelling - Narrative & Compelling</SelectItem>
            <SelectItem value="dramatic">🎬 Dramatic - Cinematic & Bold</SelectItem>
            <SelectItem value="documentary">🎞️ Documentary - Objective & Engaging</SelectItem>
            <SelectItem value="horror">👻 Horror - Dark & Suspenseful</SelectItem>
            <SelectItem value="tech">💻 Tech - Futuristic & Innovative</SelectItem>
            <SelectItem value="fantasy">🧙 Fantasy - Magical & Mythical</SelectItem>
            <SelectItem value="comedy">😄 Comedy - Humorous & Entertaining</SelectItem>
            <SelectItem value="inspirational">💡 Inspirational - Motivating & Uplifting</SelectItem>
            <SelectItem value="investigative">🔍 Investigative - Mystery & Discovery</SelectItem>
            <SelectItem value="emotional">❤️ Emotional - Heartfelt & Moving</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cost Info */}
      <Alert className="bg-muted/50">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <span className="font-semibold flex items-center gap-1">
            Estimated cost: <Coins className="h-4 w-4" />{estimatedCost}
          </span>
          <br />
          <span className="text-xs text-muted-foreground">
            Final cost based on audio length (1s = 0.3 credits)
          </span>
        </AlertDescription>
      </Alert>

      {/* Generate Script Button */}
      <Button
        onClick={onGenerateScript}
        disabled={isDisabled || !topic.trim() || isGenerating || !canAfford}
        className="w-full min-h-[48px] font-bold"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Script...
          </>
        ) : !canAfford ? (
          'Insufficient Credits'
        ) : (
          <>
            Generate Script (~<Coins className="inline h-4 w-4 mx-0.5" />{estimatedCost})
          </>
        )}
      </Button>
    </div>
  );
}
