import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Video, Palette } from 'lucide-react';

interface ShotstackConfigStepProps {
  videoUrl: string;
  textOverlay: string;
  backgroundColor: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '4:5' | '1:1';
  onVideoUrlChange: (url: string) => void;
  onTextOverlayChange: (text: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onDurationChange: (duration: number) => void;
  onAspectRatioChange: (ratio: '16:9' | '9:16' | '4:5' | '1:1') => void;
  onSubmit: () => void;
  isDisabled: boolean;
}

const SAMPLE_VIDEOS = [
  { label: 'Beach Overhead', url: 'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/beach-overhead.mp4' },
  { label: 'City Street', url: 'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/city-street.mp4' },
  { label: 'Nature Forest', url: 'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/nature-forest.mp4' },
  { label: 'Office Work', url: 'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/office-work.mp4' },
];

export function ShotstackConfigStep({
  videoUrl,
  textOverlay,
  backgroundColor,
  duration,
  aspectRatio,
  onVideoUrlChange,
  onTextOverlayChange,
  onBackgroundColorChange,
  onDurationChange,
  onAspectRatioChange,
  onSubmit,
  isDisabled,
}: ShotstackConfigStepProps) {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.round(seconds / 60);
    return `${seconds}s (~${mins} min${mins !== 1 ? 's' : ''})`;
  };

  return (
    <div className="space-y-4">
      {/* Video URL */}
      <div className="space-y-2">
        <Label htmlFor="videoUrl" className="text-sm font-bold">
          Video Source URL *
        </Label>
        <Input
          id="videoUrl"
          placeholder="https://example.com/video.mp4"
          value={videoUrl}
          onChange={(e) => onVideoUrlChange(e.target.value)}
          disabled={isDisabled}
          className="text-sm w-full min-h-[44px]"
        />
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-1">Samples:</span>
          {SAMPLE_VIDEOS.map((sample) => (
            <button
              key={sample.label}
              onClick={() => onVideoUrlChange(sample.url)}
              disabled={isDisabled}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text Overlay */}
      <div className="space-y-2">
        <Label htmlFor="textOverlay" className="text-sm font-bold">
          Text Overlay
        </Label>
        <Input
          id="textOverlay"
          placeholder="Enter text to overlay on video (optional)"
          value={textOverlay}
          onChange={(e) => onTextOverlayChange(e.target.value)}
          disabled={isDisabled}
          className="text-sm w-full min-h-[44px]"
        />
      </div>

      {/* Duration Slider */}
      <div className="space-y-2">
        <Label htmlFor="duration" className="text-sm font-bold">
          Duration: {formatDuration(duration)}
        </Label>
        <div className="overflow-x-hidden px-1">
          <Slider
            id="duration"
            min={1}
            max={30}
            step={1}
            value={[duration]}
            onValueChange={(value) => onDurationChange(value[0])}
            disabled={isDisabled}
            className="w-full max-w-full"
          />
        </div>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label htmlFor="aspectRatio" className="text-sm font-bold">
          Aspect Ratio
        </Label>
        <Select
          value={aspectRatio}
          onValueChange={(value) => onAspectRatioChange(value as '16:9' | '9:16' | '4:5' | '1:1')}
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

      {/* Background Color */}
      <div className="space-y-2">
        <Label className="text-sm font-bold">Background Color</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2 min-h-[44px]" disabled={isDisabled}>
              <div
                className="w-5 h-5 rounded border-2"
                style={{ backgroundColor: backgroundColor }}
              />
              <Palette className="h-4 w-4 mr-2" />
              {backgroundColor}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <Label className="text-xs">Pick a color</Label>
              <Input
                type="color"
                value={backgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                className="h-10 cursor-pointer"
              />
              <div className="flex gap-1 flex-wrap">
                {['#000000', '#1a1a1a', '#0f172a', '#1e3a8a', '#7c3aed', '#dc2626'].map((color) => (
                  <button
                    key={color}
                    onClick={() => onBackgroundColorChange(color)}
                    className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Submit Button */}
      <Button
        onClick={onSubmit}
        disabled={isDisabled || !videoUrl.trim()}
        className="w-full min-h-[48px] font-bold"
        size="lg"
      >
        {isDisabled ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Video className="mr-2 h-4 w-4" />
            Submit Render to Shotstack
          </>
        )}
      </Button>
    </div>
  );
}
