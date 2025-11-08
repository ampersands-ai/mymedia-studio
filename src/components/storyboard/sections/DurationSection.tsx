import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface DurationSectionProps {
  duration: number;
  onDurationChange: (duration: number) => void;
  disabled?: boolean;
}

export function DurationSection({ duration, onDurationChange, disabled }: DurationSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Video Duration</Label>
        <span className="text-sm font-bold text-primary">
          {duration}s (~{Math.round(duration / 5)} scenes)
        </span>
      </div>
      <Slider
        value={[duration]}
        onValueChange={(values) => onDurationChange(values[0])}
        min={15}
        max={120}
        step={5}
        disabled={disabled}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>15s</span>
        <span>120s</span>
      </div>
    </div>
  );
}
