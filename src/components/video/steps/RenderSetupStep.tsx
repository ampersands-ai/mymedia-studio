import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, Loader2, Video, Check, Film, Sparkles } from 'lucide-react';
import { BackgroundMediaSelector, SelectedMedia } from '../BackgroundMediaSelector';
import { captionPresets, aspectRatioConfig, CAPTION_FONTS } from '@/config/captionStyles';
import { CaptionStyle } from '@/types/video';
import { cn } from '@/lib/utils';
import { NotifyOnCompletionToggle } from '@/components/shared/NotifyOnCompletionToggle';

export type BackgroundMode = 'stock' | 'ai_generated';

interface RenderSetupStepProps {
  aspectRatio: '16:9' | '9:16' | '4:5' | '1:1';
  captionStyle: CaptionStyle;
  selectedBackgroundMedia: SelectedMedia[];
  duration: number;
  style: string;
  notifyOnCompletion: boolean;
  backgroundMode: BackgroundMode;
  onAspectRatioChange: (ratio: '16:9' | '9:16' | '4:5' | '1:1') => void;
  onCaptionStyleChange: (style: CaptionStyle) => void;
  onBackgroundMediaChange: (media: SelectedMedia[]) => void;
  onNotifyOnCompletionChange: (notify: boolean) => void;
  onBackgroundModeChange: (mode: BackgroundMode) => void;
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
  notifyOnCompletion,
  backgroundMode,
  onAspectRatioChange,
  onCaptionStyleChange,
  onBackgroundMediaChange,
  onNotifyOnCompletionChange,
  onBackgroundModeChange,
  onRenderVideo,
  isRendering,
  isDisabled,
}: RenderSetupStepProps) {
  const [captionCustomizationOpen, setCaptionCustomizationOpen] = useState(false);
  const [presetName, setPresetName] = useState('modern');

  const handlePresetChange = (value: string) => {
    setPresetName(value);
    onCaptionStyleChange(captionPresets[value]);
  };

  const handleFontChange = (fontFamily: string) => {
    const font = CAPTION_FONTS.find(f => f.family === fontFamily);
    onCaptionStyleChange({
      ...captionStyle,
      fontFamily,
      fontUrl: font?.url || undefined,
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

        <CollapsibleContent className="space-y-4 pt-2">
          {/* Visual Preset Grid */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Select Style</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(captionPresets).map(([name, preset]) => (
                <button
                  key={name}
                  onClick={() => handlePresetChange(name)}
                  disabled={isDisabled}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-left relative",
                    presetName === name 
                      ? "border-primary bg-primary/10" 
                      : "border-muted hover:border-primary/50",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {presetName === name && (
                    <div className="absolute top-1.5 right-1.5">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  {/* Mini preview */}
                  <div 
                    className="h-8 rounded flex items-center justify-center text-xs mb-1.5"
                    style={{ 
                      backgroundColor: preset.backgroundColor, 
                      color: preset.textColor,
                      opacity: preset.backgroundOpacity ?? 0.95,
                    }}
                  >
                    Aa
                  </div>
                  <p className="text-xs capitalize text-center font-medium">{name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Font Selector */}
          <div className="space-y-2">
            <Label className="text-xs">Font</Label>
            <Select 
              value={captionStyle.fontFamily || 'Space Grotesk Bold'} 
              onValueChange={handleFontChange} 
              disabled={isDisabled}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPTION_FONTS.map((font) => (
                  <SelectItem key={font.family} value={font.family}>
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Text Size */}
          <div className="space-y-2">
            <Label className="text-xs">Text Size</Label>
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
        </CollapsibleContent>
      </Collapsible>

      {/* Background Media */}
      <div className="space-y-3">
        <Label className="text-sm font-bold">Background Media</Label>
        <Tabs 
          value={backgroundMode} 
          onValueChange={(value) => onBackgroundModeChange(value as BackgroundMode)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stock" disabled={isDisabled} className="gap-2">
              <Film className="w-4 h-4" />
              Stock
            </TabsTrigger>
            <TabsTrigger value="ai_generated" disabled={isDisabled} className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI Generated
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {backgroundMode === 'stock' ? (
          <>
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
          </>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">AI-Generated Backgrounds</p>
                <p className="text-xs text-muted-foreground">
                  Custom images will be generated based on your script during video rendering. 
                  This uses AI to create unique visuals that match your content.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notification Toggle */}
      <NotifyOnCompletionToggle
        checked={notifyOnCompletion}
        onCheckedChange={onNotifyOnCompletionChange}
        disabled={isDisabled}
        description="Get an email when your video is ready"
      />

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
