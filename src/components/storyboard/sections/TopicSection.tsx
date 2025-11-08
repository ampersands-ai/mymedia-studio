import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

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

interface TopicSectionProps {
  topic: string;
  onTopicChange: (topic: string) => void;
  disabled?: boolean;
}

export function TopicSection({ topic, onTopicChange, disabled }: TopicSectionProps) {
  const handleSurpriseMe = () => {
    const randomTopic = TOPIC_SUGGESTIONS[Math.floor(Math.random() * TOPIC_SUGGESTIONS.length)];
    onTopicChange(randomTopic);
    toast.success('✨ Random topic selected!', { id: 'random-topic' });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="topic" className="text-sm font-medium">
        Video Topic *
      </Label>
      <Textarea
        id="topic"
        placeholder="e.g., 'The Science Behind Dreams' or 'Top 5 Ancient Civilizations'"
        value={topic}
        onChange={(e) => onTopicChange(e.target.value)}
        className="min-h-[80px] resize-none"
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSurpriseMe}
        disabled={disabled}
        className="gap-2"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Surprise Me
      </Button>
    </div>
  );
}
