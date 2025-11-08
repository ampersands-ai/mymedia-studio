import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ResolutionSelectorProps {
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  disabled?: boolean;
}

export function ResolutionSelector({ aspectRatio, onAspectRatioChange, disabled }: ResolutionSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Resolution</Label>
      <Select value={aspectRatio} onValueChange={onAspectRatioChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="sd">SD - 640×480 (4:3)</SelectItem>
          <SelectItem value="hd">HD - 1280×720 (16:9)</SelectItem>
          <SelectItem value="full-hd">Full HD - 1920×1080 (16:9)</SelectItem>
          <SelectItem value="squared">Square - 1080×1080 (1:1)</SelectItem>
          <SelectItem value="instagram-story">Instagram Story - 1080×1920 (9:16)</SelectItem>
          <SelectItem value="instagram-feed">Instagram Feed - 1080×1350 (4:5)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
