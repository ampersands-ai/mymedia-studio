import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Video as VideoIcon, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaType } from '@/types/video';

const MEDIA_TYPES = [
  { value: 'image' as MediaType, label: 'Static Images', icon: ImageIcon, description: 'AI-generated images' },
  { value: 'video' as MediaType, label: 'Video Clips', icon: VideoIcon, description: 'Stock video footage' },
  { value: 'animated' as MediaType, label: 'Animated', icon: Wand2, description: 'Images with motion effects' },
];

interface MediaTypeSelectorProps {
  mediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  disabled?: boolean;
}

export function MediaTypeSelector({ mediaType, onMediaTypeChange, disabled }: MediaTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Media Type</Label>
      <div className="grid grid-cols-3 gap-2">
        {MEDIA_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onMediaTypeChange(type.value)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                mediaType === type.value
                  ? "border-primary bg-primary/10"
                  : "border-muted hover:border-primary/50"
              )}
            >
              <Icon className="w-5 h-5" />
              <div className="text-center">
                <p className="text-xs font-medium">{type.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{type.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
