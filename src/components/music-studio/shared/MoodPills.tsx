import { cn } from '@/lib/utils';
import type { Mood, MoodOption } from '../types/music-studio.types';

interface MoodPillsProps {
  moods: MoodOption[];
  selectedMood?: Mood;
  onSelect: (mood: Mood) => void;
  className?: string;
}

export function MoodPills({ moods, selectedMood, onSelect, className }: MoodPillsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {moods.map((mood) => {
        const isSelected = selectedMood === mood.value;
        
        return (
          <button
            key={mood.value}
            onClick={() => onSelect(mood.value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              'border hover:scale-105',
              isSelected
                ? 'bg-primary-orange text-black border-primary-orange shadow-lg shadow-primary-orange/30'
                : 'bg-card border-border text-foreground hover:border-primary-orange/50 hover:bg-muted'
            )}
          >
            {mood.label}
          </button>
        );
      })}
    </div>
  );
}
