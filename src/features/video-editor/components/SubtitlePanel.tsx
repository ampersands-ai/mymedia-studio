import { Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { useVideoEditorStore } from '../store';
import { SubtitleMode } from '../types';

const SUBTITLE_MODES: { value: SubtitleMode; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'No subtitles' },
  { value: 'auto', label: 'Auto-generate', desc: 'AI transcription' },
  { value: 'upload', label: 'Upload SRT', desc: 'Custom file' },
];

const POSITION_OPTIONS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
];

const FONT_SIZES = [
  { value: 16, label: 'Small' },
  { value: 24, label: 'Medium' },
  { value: 32, label: 'Large' },
  { value: 48, label: 'Extra Large' },
];

export const SubtitlePanel = () => {
  const { subtitleConfig, updateSubtitleConfig } = useVideoEditorStore();

  const handleSRTUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      updateSubtitleConfig({ 
        srtFile: file, 
        srtContent: content,
        mode: 'upload' 
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      {/* Mode Selection */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Subtitle Mode</Label>
        <RadioGroup
          value={subtitleConfig.mode}
          onValueChange={(value) => updateSubtitleConfig({ mode: value as SubtitleMode })}
          className="grid grid-cols-3 gap-2"
        >
          {SUBTITLE_MODES.map((mode) => (
            <div key={mode.value}>
              <RadioGroupItem value={mode.value} id={`sub-${mode.value}`} className="peer sr-only" />
              <Label
                htmlFor={`sub-${mode.value}`}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-card p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
              >
                <span className="text-sm font-medium">{mode.label}</span>
                <span className="text-xs text-muted-foreground">{mode.desc}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* SRT Upload (only when mode is 'upload') */}
      {subtitleConfig.mode === 'upload' && (
        <div className="space-y-2">
          <Label className="text-sm">SRT File</Label>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".srt,.vtt"
              onChange={handleSRTUpload}
              className="hidden"
              id="srt-upload"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById('srt-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {subtitleConfig.srtFile ? subtitleConfig.srtFile.name : 'Choose SRT file'}
            </Button>
          </div>
        </div>
      )}

      {/* Style settings (only when subtitles are enabled) */}
      {subtitleConfig.mode !== 'none' && (
        <>
          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Font Size</Label>
              <span className="text-sm text-muted-foreground">{subtitleConfig.fontSize}px</span>
            </div>
            <Select
              value={subtitleConfig.fontSize.toString()}
              onValueChange={(value) => updateSubtitleConfig({ fontSize: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value.toString()}>
                    {size.label} ({size.value}px)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Color */}
          <div className="space-y-2">
            <Label className="text-sm">Font Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={subtitleConfig.fontColor}
                onChange={(e) => updateSubtitleConfig({ fontColor: e.target.value })}
                className="h-10 w-14 rounded border cursor-pointer"
              />
              <span className="text-sm text-muted-foreground uppercase">
                {subtitleConfig.fontColor}
              </span>
            </div>
          </div>

          {/* Background */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="showBg" className="text-sm">Show Background</Label>
              <Switch
                id="showBg"
                checked={subtitleConfig.showBackground}
                onCheckedChange={(checked) => updateSubtitleConfig({ showBackground: checked })}
              />
            </div>
            
            {subtitleConfig.showBackground && (
              <div className="space-y-2">
                <Label className="text-sm">Background Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={subtitleConfig.backgroundColor}
                    onChange={(e) => updateSubtitleConfig({ backgroundColor: e.target.value })}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground uppercase">
                    {subtitleConfig.backgroundColor}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label className="text-sm">Position</Label>
            <Select
              value={subtitleConfig.position}
              onValueChange={(value) => updateSubtitleConfig({ position: value as 'top' | 'center' | 'bottom' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITION_OPTIONS.map((pos) => (
                  <SelectItem key={pos.value} value={pos.value}>
                    {pos.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
};
