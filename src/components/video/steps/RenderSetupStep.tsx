import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Loader2, Video } from 'lucide-react';
import { BackgroundMediaSelector, SelectedMedia } from '../BackgroundMediaSelector';
import { captionPresets, aspectRatioConfig, textEffectPresets } from '@/config/captionStyles';
import { CaptionStyle } from '@/types/video';

interface RenderSetupStepProps {
  aspectRatio: '16:9' | '9:16' | '4:5' | '1:1';
  captionStyle: CaptionStyle;
  selectedBackgroundMedia: SelectedMedia[];
  duration: number;
  style: string;
  onAspectRatioChange: (ratio: '16:9' | '9:16' | '4:5' | '1:1') => void;
  onCaptionStyleChange: (style: CaptionStyle) => void;
  onBackgroundMediaChange: (media: SelectedMedia[]) => void;
  onRenderVideo: () => void;
  isRendering: boolean;
  isDisabled: boolean;
}

export function RenderSetupStep({
  aspectRatio,
  captionStyle,
  selectedBackgroundMedia,
  duration,
  style,
  onAspectRatioChange,
  onCaptionStyleChange,
  onBackgroundMediaChange,
  onRenderVideo,
  isRendering,
  isDisabled,
}: RenderSetupStepProps) {
  const [captionCustomizationOpen, setCaptionCustomizationOpen] = useState(false);
  const [presetName, setPresetName] = useState('modern');
  const [textEffect, setTextEffect] = useState('none');

  const handlePresetChange = (value: string) => {
    setPresetName(value);
    onCaptionStyleChange(captionPresets[value]);
  };

  const handleTextEffectChange = (value: string) => {
    setTextEffect(value);
    onCaptionStyleChange({
      ...captionStyle,
      ...textEffectPresets[value],
    });
  };

  return (
    <div className="space-y-4">
      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label htmlFor="aspectRatio" className="text-sm font-bold">
          Aspect Ratio
        </Label>
        <Select
          value={aspectRatio}
          onValueChange={(value) => onAspectRatioChange(value as '16:9' | '1:1' | '4:5' | '9:16')}
          disabled={isDisabled}
        >
          <SelectTrigger id="aspectRatio" className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(aspectRatioConfig).map(([ratio, config]) => (
              <SelectItem key={ratio} value={ratio}>
                {config.label} ({ratio})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose the format for your target platform
        </p>
      </div>

      {/* Caption Customization */}
      <Collapsible
        open={captionCustomizationOpen}
        onOpenChange={setCaptionCustomizationOpen}
        className="space-y-2"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full group min-h-[44px] touch-manipulation">
          <Label className="text-sm font-bold cursor-pointer">Customize Captions</Label>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${captionCustomizationOpen ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>

        {/* Preview Box */}
        <div
          className="p-4 rounded-lg border-2 border-dashed relative"
          style={{ minHeight: '100px' }}
        >
          <div className="text-xs text-muted-foreground mb-2">Caption Preview</div>
          <div
            className="inline-block px-3 py-2 rounded"
            style={{
              backgroundColor: captionStyle.backgroundColor,
              opacity: captionStyle.backgroundOpacity ?? 0.95,
              padding: `${captionStyle.backgroundPadding ?? 15}px`,
              borderRadius: `${captionStyle.backgroundBorderRadius ?? 8}px`,
            }}
          >
            <span
              style={{
                color: captionStyle.textColor,
                fontSize: `${Math.min(captionStyle.fontSize / 2, 24)}px`,
                fontWeight: captionStyle.fontWeight,
                lineHeight: captionStyle.lineHeight ?? 1.3,
                WebkitTextStroke: captionStyle.strokeWidth
                  ? `${captionStyle.strokeWidth}px ${captionStyle.strokeColor ?? '#000000'}`
                  : undefined,
                textShadow: captionStyle.shadowBlur
                  ? `${captionStyle.shadowOffsetX ?? 0}px ${captionStyle.shadowOffsetY ?? 0}px ${captionStyle.shadowBlur}px ${captionStyle.shadowColor ?? '#000000'}`
                  : undefined,
              }}
            >
              Sample Caption Text
            </span>
          </div>
        </div>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Preset selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Start with a Preset</Label>
            <Select value={presetName} onValueChange={handlePresetChange} disabled={isDisabled}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="elegant">Elegant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Text Effect Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">✨ Text Effects</Label>
            <Select value={textEffect} onValueChange={handleTextEffectChange} disabled={isDisabled}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">🚫 No Effect</SelectItem>
                <SelectItem value="classicShadow">🌑 Classic Shadow</SelectItem>
                <SelectItem value="softShadow">☁️ Soft Shadow</SelectItem>
                <SelectItem value="boldOutline">⚫ Bold Outline</SelectItem>
                <SelectItem value="neonGlow">💚 Neon Glow</SelectItem>
                <SelectItem value="dramaticGlow">💖 Dramatic Glow</SelectItem>
                <SelectItem value="goldLuxury">✨ Gold Luxury</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Font Size</Label>
              <Input
                type="number"
                min={30}
                max={80}
                step={1}
                value={captionStyle.fontSize}
                onChange={(e) =>
                  onCaptionStyleChange({
                    ...captionStyle,
                    fontSize: Math.max(30, Math.min(80, Number(e.target.value))),
                  })
                }
                disabled={isDisabled}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">BG Opacity</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={5}
                value={Math.round((captionStyle.backgroundOpacity ?? 0.95) * 100)}
                onChange={(e) =>
                  onCaptionStyleChange({
                    ...captionStyle,
                    backgroundOpacity: Math.max(0, Math.min(100, Number(e.target.value))) / 100,
                  })
                }
                disabled={isDisabled}
                className="h-10"
              />
            </div>
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <Label className="text-xs">Text Color</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 h-10" disabled={isDisabled}>
                  <div
                    className="w-5 h-5 rounded border-2"
                    style={{ backgroundColor: captionStyle.textColor }}
                  />
                  {captionStyle.textColor}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <Input
                  type="color"
                  value={captionStyle.textColor}
                  onChange={(e) =>
                    onCaptionStyleChange({
                      ...captionStyle,
                      textColor: e.target.value,
                    })
                  }
                  className="h-10 cursor-pointer"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label className="text-xs">Background Color</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 h-10" disabled={isDisabled}>
                  <div
                    className="w-5 h-5 rounded border-2"
                    style={{ backgroundColor: captionStyle.backgroundColor }}
                  />
                  {captionStyle.backgroundColor}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <Input
                  type="color"
                  value={captionStyle.backgroundColor}
                  onChange={(e) =>
                    onCaptionStyleChange({
                      ...captionStyle,
                      backgroundColor: e.target.value,
                    })
                  }
                  className="h-10 cursor-pointer"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Shadow Blur */}
          <div className="space-y-2">
            <Label className="text-xs">Shadow Blur: {captionStyle.shadowBlur ?? 0}px</Label>
            <Slider
              min={0}
              max={20}
              step={1}
              value={[captionStyle.shadowBlur ?? 0]}
              onValueChange={(value) =>
                onCaptionStyleChange({
                  ...captionStyle,
                  shadowBlur: value[0],
                })
              }
              disabled={isDisabled}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Background Media */}
      <div className="space-y-2">
        <Label className="text-sm font-bold">Background Media</Label>
        <BackgroundMediaSelector
          style={style}
          duration={duration}
          aspectRatio={aspectRatio}
          selectedMedia={selectedBackgroundMedia}
          onSelectMedia={onBackgroundMediaChange}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty for auto-selection based on topic
        </p>
      </div>

      {/* Render Video Button */}
      <Button
        onClick={onRenderVideo}
        disabled={isDisabled || isRendering}
        className="w-full min-h-[48px] font-bold"
        size="lg"
      >
        {isRendering ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Rendering Video...
          </>
        ) : (
          <>
            <Video className="mr-2 h-4 w-4" />
            Render Video
          </>
        )}
      </Button>
    </div>
  );
}
