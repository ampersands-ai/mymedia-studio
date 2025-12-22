import { useVideoEditorStore } from '../store';
import { TransitionType } from '../types';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const TRANSITIONS: { value: TransitionType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'fadeToBlack', label: 'Fade to Black' },
  { value: 'fadeToWhite', label: 'Fade to White' },
  { value: 'slideLeft', label: 'Slide Left' },
  { value: 'slideRight', label: 'Slide Right' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'slideDown', label: 'Slide Down' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'wipeLeft', label: 'Wipe Left' },
  { value: 'wipeRight', label: 'Wipe Right' },
];

const FIT_OPTIONS = [
  { value: 'cover', label: 'Cover (fill frame)' },
  { value: 'contain', label: 'Contain (fit inside)' },
  { value: 'crop', label: 'Crop' },
  { value: 'none', label: 'None (original size)' },
];

export const ClipSettingsPanel = () => {
  const { clips, selectedClipId, assets, updateClip, selectClip } = useVideoEditorStore();
  
  const selectedClip = clips.find(c => c.id === selectedClipId);
  const asset = selectedClip ? assets.find(a => a.id === selectedClip.assetId) : null;
  
  if (!selectedClip || !asset) {
    return null;
  }

  const maxDuration = asset.type === 'video' ? (asset.duration || 60) : 30;

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Clip Settings: {asset.name}</h3>
        <Button size="icon" variant="ghost" onClick={() => selectClip(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Duration</Label>
          <span className="text-xs text-muted-foreground">{selectedClip.duration.toFixed(1)}s</span>
        </div>
        <Slider
          value={[selectedClip.duration]}
          min={0.5}
          max={maxDuration}
          step={0.5}
          onValueChange={([value]) => updateClip(selectedClip.id, { duration: value })}
        />
      </div>

      {/* Trim Start (for videos only) */}
      {asset.type === 'video' && asset.duration && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Trim Start</Label>
            <span className="text-xs text-muted-foreground">{selectedClip.trimStart.toFixed(1)}s</span>
          </div>
          <Slider
            value={[selectedClip.trimStart]}
            min={0}
            max={Math.max(0, asset.duration - selectedClip.duration)}
            step={0.1}
            onValueChange={([value]) => updateClip(selectedClip.id, { trimStart: value })}
          />
        </div>
      )}

      {/* Volume (for videos only) */}
      {asset.type === 'video' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Volume</Label>
            <span className="text-xs text-muted-foreground">{Math.round(selectedClip.volume * 100)}%</span>
          </div>
          <Slider
            value={[selectedClip.volume]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={([value]) => updateClip(selectedClip.id, { volume: value })}
          />
        </div>
      )}

      {/* Transition In */}
      <div className="space-y-2">
        <Label className="text-xs">Transition In</Label>
        <Select
          value={selectedClip.transitionIn || 'none'}
          onValueChange={(value) => updateClip(selectedClip.id, { transitionIn: value as TransitionType })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSITIONS.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transition Out */}
      <div className="space-y-2">
        <Label className="text-xs">Transition Out</Label>
        <Select
          value={selectedClip.transitionOut || 'none'}
          onValueChange={(value) => updateClip(selectedClip.id, { transitionOut: value as TransitionType })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSITIONS.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Fit Mode */}
      <div className="space-y-2">
        <Label className="text-xs">Fit Mode</Label>
        <Select
          value={selectedClip.fit}
          onValueChange={(value) => updateClip(selectedClip.id, { fit: value as 'cover' | 'contain' | 'crop' | 'none' })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIT_OPTIONS.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scale */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Scale</Label>
          <span className="text-xs text-muted-foreground">{Math.round(selectedClip.scale * 100)}%</span>
        </div>
        <Slider
          value={[selectedClip.scale]}
          min={0.1}
          max={2}
          step={0.05}
          onValueChange={([value]) => updateClip(selectedClip.id, { scale: value })}
        />
      </div>
    </div>
  );
};
