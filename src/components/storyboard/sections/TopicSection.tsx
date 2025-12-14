import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STORAGE_KEY = 'faceless_video_recent_topics';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

interface RecentTopic {
  topic: string;
  timestamp: number;
}

function getRecentTopics(): RecentTopic[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const topics: RecentTopic[] = JSON.parse(stored);
    const twoWeeksAgo = Date.now() - TWO_WEEKS_MS;
    return topics.filter(t => t.timestamp > twoWeeksAgo);
  } catch {
    return [];
  }
}

function saveRecentTopic(topic: string): void {
  try {
    const recent = getRecentTopics();
    recent.push({ topic: topic.toLowerCase().trim(), timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch {
    // Ignore storage errors
  }
}

function isTopicSimilar(newTopic: string, recentTopics: RecentTopic[]): boolean {
  const normalizedNew = newTopic.toLowerCase().trim();
  return recentTopics.some(recent => {
    const normalizedRecent = recent.topic;
    // Check for exact match or significant overlap
    return normalizedNew === normalizedRecent ||
      normalizedNew.includes(normalizedRecent) ||
      normalizedRecent.includes(normalizedNew);
  });
}

interface TopicSectionProps {
  topic: string;
  onTopicChange: (topic: string) => void;
  disabled?: boolean;
}

export function TopicSection({ topic, onTopicChange, disabled }: TopicSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSurpriseMe = async () => {
    setIsGenerating(true);
    const recentTopics = getRecentTopics();
    let attempts = 0;
    const maxAttempts = 3;

    try {
      while (attempts < maxAttempts) {
        attempts++;
        
        const { data, error } = await supabase.functions.invoke('generate-video-topic');
        
        if (error) {
          throw error;
        }

        if (data?.error) {
          if (data.error.includes('Rate limit')) {
            toast.error('Please wait a moment before generating another topic');
            return;
          }
          throw new Error(data.error);
        }

        const generatedTopic = data?.topic;
        if (!generatedTopic) {
          throw new Error('No topic generated');
        }

        // Check if topic is similar to recent ones
        if (!isTopicSimilar(generatedTopic, recentTopics)) {
          saveRecentTopic(generatedTopic);
          onTopicChange(generatedTopic);
          return;
        }

        // If similar and we have more attempts, retry
        if (attempts >= maxAttempts) {
          // Use it anyway after max attempts
          saveRecentTopic(generatedTopic);
          onTopicChange(generatedTopic);
        }
      }
    } catch (error) {
      console.error('Failed to generate topic:', error);
      toast.error('Failed to generate topic. Please try again.');
    } finally {
      setIsGenerating(false);
    }
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
        disabled={disabled || isGenerating}
        className="gap-2"
      >
        {isGenerating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        {isGenerating ? 'Generating...' : 'Surprise Me'}
      </Button>
    </div>
  );
}
