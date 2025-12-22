import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVideoEditorStore } from '../store';
import { AspectRatio } from '../types';

const ASPECT_RATIOS: { value: AspectRatio; label: string; desc: string }[] = [
  { value: '16:9', label: '16:9', desc: 'YouTube, TV' },
  { value: '9:16', label: '9:16', desc: 'TikTok, Reels' },
  { value: '1:1', label: '1:1', desc: 'Instagram' },
  { value: '4:5', label: '4:5', desc: 'Instagram Post' },
  { value: '21:9', label: '21:9', desc: 'Cinematic' },
];

const FPS_OPTIONS = [
  { value: 25, label: '25 FPS', desc: 'PAL/Film' },
  { value: 30, label: '30 FPS', desc: 'Standard' },
  { value: 60, label: '60 FPS', desc: 'Smooth' },
];

const QUALITY_OPTIONS = [
  { value: 'sd', label: 'SD', desc: '480p' },
  { value: 'hd', label: 'HD', desc: '720p/1080p' },
  { value: '4k', label: '4K', desc: '2160p' },
];

export const OutputSettingsPanel = () => {
  const { outputSettings, updateOutputSettings, getTotalDuration, getEstimatedCredits } = useVideoEditorStore();

  const totalDuration = getTotalDuration();
  const estimatedCredits = getEstimatedCredits();

  return (
    <div className="space-y-6">
      {/* Aspect Ratio */}
      <div>
        <Label className="text-base font-medium">Aspect Ratio</Label>
        <RadioGroup
          value={outputSettings.aspectRatio}
          onValueChange={(value) => updateOutputSettings({ aspectRatio: value as AspectRatio })}
          className="grid grid-cols-2 gap-2 mt-3"
        >
          {ASPECT_RATIOS.map((ratio) => (
            <div key={ratio.value}>
              <RadioGroupItem value={ratio.value} id={ratio.value} className="peer sr-only" />
              <Label
                htmlFor={ratio.value}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
              >
                <span className="text-sm font-bold">{ratio.label}</span>
                <span className="text-xs text-muted-foreground">{ratio.desc}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Background Color */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Background Color</Label>
        <p className="text-xs text-muted-foreground">Used for letterboxing/pillarboxing</p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={outputSettings.backgroundColor}
            onChange={(e) => updateOutputSettings({ backgroundColor: e.target.value })}
            className="h-10 w-14 rounded border cursor-pointer"
          />
          <span className="text-sm text-muted-foreground uppercase">
            {outputSettings.backgroundColor}
          </span>
        </div>
      </div>

      {/* FPS */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Frame Rate</Label>
        <Select
          value={outputSettings.fps.toString()}
          onValueChange={(value) => updateOutputSettings({ fps: parseInt(value) as 25 | 30 | 60 })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FPS_OPTIONS.map((fps) => (
              <SelectItem key={fps.value} value={fps.value.toString()}>
                {fps.label} - {fps.desc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quality */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Video Quality</Label>
        <Select
          value={outputSettings.quality}
          onValueChange={(value) => updateOutputSettings({ quality: value as 'sd' | 'hd' | '4k' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUALITY_OPTIONS.map((q) => (
              <SelectItem key={q.value} value={q.value}>
                {q.label} - {q.desc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Duration</span>
          <span className="font-medium">{totalDuration.toFixed(1)}s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Format</span>
          <span className="font-medium">MP4</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Quality</span>
          <span className="font-medium uppercase">{outputSettings.quality}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">FPS</span>
          <span className="font-medium">{outputSettings.fps}</span>
        </div>
        <div className="flex justify-between text-lg pt-2 border-t">
          <span className="text-muted-foreground">Estimated Cost</span>
          <span className="font-bold text-primary">{estimatedCredits} credits</span>
        </div>
      </div>
    </div>
  );
};
