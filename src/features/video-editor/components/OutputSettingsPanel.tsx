import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useVideoEditorStore } from '../store';
import { AspectRatio } from '../types';

const ASPECT_RATIOS: { value: AspectRatio; label: string; desc: string }[] = [
  { value: '16:9', label: '16:9', desc: 'YouTube, TV' },
  { value: '9:16', label: '9:16', desc: 'TikTok, Reels' },
  { value: '1:1', label: '1:1', desc: 'Instagram' },
  { value: '4:5', label: '4:5', desc: 'Instagram Post' },
];

export const OutputSettingsPanel = () => {
  const { outputSettings, updateOutputSettings, getTotalDuration, getEstimatedCredits } = useVideoEditorStore();

  const totalDuration = getTotalDuration();
  const estimatedCredits = getEstimatedCredits();

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Aspect Ratio</Label>
        <RadioGroup
          value={outputSettings.aspectRatio}
          onValueChange={(value) => updateOutputSettings({ aspectRatio: value as AspectRatio })}
          className="grid grid-cols-2 gap-3 mt-3"
        >
          {ASPECT_RATIOS.map((ratio) => (
            <div key={ratio.value}>
              <RadioGroupItem value={ratio.value} id={ratio.value} className="peer sr-only" />
              <Label
                htmlFor={ratio.value}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
              >
                <span className="text-lg font-bold">{ratio.label}</span>
                <span className="text-xs text-muted-foreground">{ratio.desc}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Duration</span>
          <span className="font-medium">{totalDuration.toFixed(1)}s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Format</span>
          <span className="font-medium">MP4 (HD)</span>
        </div>
        <div className="flex justify-between text-lg">
          <span className="text-muted-foreground">Estimated Cost</span>
          <span className="font-bold text-primary">{estimatedCredits} credits</span>
        </div>
      </div>
    </div>
  );
};
