import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AspectRatio = '16:9' | '9:16' | '4:5' | '1:1';
export type VideoStyle = 'cinematic' | 'hyper-realistic' | 'animated' | 'documentary' | 'abstract';

interface ShotstackTopicStepProps {
  topic: string;
  duration: number;
  style: VideoStyle;
  aspectRatio: AspectRatio;
  onTopicChange: (topic: string) => void;
  onDurationChange: (duration: number) => void;
  onStyleChange: (style: VideoStyle) => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onGenerateStoryboard: () => void;
  isGenerating: boolean;
  isDisabled: boolean;
}

const STYLE_OPTIONS: { value: VideoStyle; label: string; description: string }[] = [
  { value: 'cinematic', label: '🎬 Cinematic', description: 'Epic, dramatic visuals' },
  { value: 'hyper-realistic', label: '📸 Hyper-Realistic', description: 'Photorealistic quality' },
  { value: 'animated', label: '🎨 Animated', description: 'Stylized animation look' },
  { value: 'documentary', label: '📹 Documentary', description: 'Natural, authentic feel' },
  { value: 'abstract', label: '🌈 Abstract', description: 'Artistic, conceptual visuals' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
];

export function ShotstackTopicStep({
  topic,
  duration,
  style,
  aspectRatio,
  onTopicChange,
  onDurationChange,
  onStyleChange,
  onAspectRatioChange,
  onGenerateStoryboard,
  isGenerating,
  isDisabled,
}: ShotstackTopicStepProps) {
  const [isSurprising, setIsSurprising] = useState(false);

  const handleSurpriseMe = async () => {
    setIsSurprising(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-topic');
      
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Please wait a moment before generating another topic');
          return;
        }
        throw new Error(data.error);
      }

      if (data?.topic) {
        onTopicChange(data.topic);
        toast.success('Topic generated!');
      }
    } catch (error) {
      console.error('Failed to generate topic:', error);
      toast.error('Failed to generate topic. Please try again.');
    } finally {
      setIsSurprising(false);
    }
  };

  const canGenerate = topic.trim().length >= 5;

  return (
    <div className="space-y-5">
      {/* Topic Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="topic" className="text-sm font-bold">
            Video Topic *
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSurpriseMe}
            disabled={isDisabled || isSurprising}
            className="gap-1.5 h-7 text-xs"
          >
            {isSurprising ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            Surprise Me
          </Button>
        </div>
        <Textarea
          id="topic"
          placeholder="e.g., 'The Science Behind Dreams' or 'Top 5 Ancient Civilizations'"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          className="min-h-[80px] resize-none"
          disabled={isDisabled}
        />
        <p className="text-xs text-muted-foreground">
          Enter a topic for your video. AI will generate a script and image prompts.
        </p>
      </div>

      {/* Duration Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-bold">
          Duration: {duration}s ({Math.ceil(duration / 5)} scenes)
        </Label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={duration === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDurationChange(opt.value)}
              disabled={isDisabled}
              className="min-w-[50px]"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Style Selector */}
      <div className="space-y-2">
        <Label htmlFor="style" className="text-sm font-bold">
          Visual Style
        </Label>
        <Select
          value={style}
          onValueChange={(value) => onStyleChange(value as VideoStyle)}
          disabled={isDisabled}
        >
          <SelectTrigger id="style" className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STYLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col items-start">
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label htmlFor="aspectRatio" className="text-sm font-bold">
          Aspect Ratio
        </Label>
        <Select
          value={aspectRatio}
          onValueChange={(value) => onAspectRatioChange(value as AspectRatio)}
          disabled={isDisabled}
        >
          <SelectTrigger id="aspectRatio" className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">🖥️ Landscape (16:9) - YouTube</SelectItem>
            <SelectItem value="9:16">📱 Portrait (9:16) - TikTok/Reels</SelectItem>
            <SelectItem value="4:5">📸 Portrait (4:5) - Instagram Feed</SelectItem>
            <SelectItem value="1:1">⬜ Square (1:1) - Instagram</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Generate Button */}
      <Button
        onClick={onGenerateStoryboard}
        disabled={isDisabled || !canGenerate || isGenerating}
        className="w-full min-h-[48px] font-bold"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Storyboard...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Storyboard
          </>
        )}
      </Button>

      {!canGenerate && topic.length > 0 && (
        <p className="text-xs text-destructive text-center">
          Topic must be at least 5 characters
        </p>
      )}
    </div>
  );
}
