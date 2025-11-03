import { useState, useEffect } from "react";
import { Copy, RotateCcw, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import type { SubtitleSettings } from "@/types/subtitle";
import { DEFAULT_SUBTITLE_SETTINGS } from "@/types/subtitle";
import { SUBTITLE_PRESETS, FONT_FAMILIES, ANIMATION_TYPES, LANGUAGES, SUBTITLES_MODELS, FONT_WEIGHTS } from "@/config/subtitlePresets";
import { SubtitlePreview } from "./SubtitlePreview";
import { PositionGridSelector } from "./PositionGridSelector";
import { cn } from "@/lib/utils";

interface SubtitleCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings?: Partial<SubtitleSettings>;
  onSave: (settings: SubtitleSettings) => void;
}

export function SubtitleCustomizer({ open, onOpenChange, initialSettings, onSave }: SubtitleCustomizerProps) {
  const [settings, setSettings] = useState<SubtitleSettings>({
    ...DEFAULT_SUBTITLE_SETTINGS,
    ...initialSettings,
  });

  // Update settings when initialSettings change
  useEffect(() => {
    if (initialSettings) {
      setSettings(prev => ({ ...DEFAULT_SUBTITLE_SETTINGS, ...initialSettings }));
    }
  }, [initialSettings]);

  const updateSetting = <K extends keyof SubtitleSettings>(key: K, value: SubtitleSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = SUBTITLE_PRESETS[presetKey];
    if (preset) {
      setSettings(prev => ({
        ...prev,
        ...preset.settings,
      }));
    }
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SUBTITLE_SETTINGS);
  };

  const copyJSON = () => {
    const json = JSON.stringify(settings, null, 2);
    navigator.clipboard.writeText(json);
  };

  const handleSave = () => {
    onSave(settings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Advanced Subtitle Customizer
          </DialogTitle>
          <DialogDescription>
            Customize every aspect of your video subtitles with 40+ styling options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preset Cards */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Quick Presets</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(SUBTITLE_PRESETS).map(([key, preset]) => (
                <Card
                  key={key}
                  className="cursor-pointer hover:border-primary transition-all p-3 space-y-2"
                  onClick={() => applyPreset(key)}
                >
                  <div className="text-xs font-semibold">{preset.name}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2">
                    {preset.description}
                  </div>
                  <div 
                    className="text-xs text-center py-2 rounded"
                    style={{
                      fontFamily: preset.settings.fontFamily,
                      fontSize: '14px',
                      color: preset.settings.fontColor,
                      backgroundColor: preset.settings.backgroundColor === 'transparent' 
                        ? 'transparent' 
                        : `${preset.settings.backgroundColor}${Math.round((preset.settings.backgroundOpacity || 0.8) * 255).toString(16).padStart(2, '0')}`,
                      padding: '4px 8px',
                      borderRadius: `${preset.settings.backgroundRadius}px`,
                    }}
                  >
                    Sample
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Live Preview</Label>
            <SubtitlePreview settings={settings} />
          </div>

          {/* Collapsible Sections */}
          <Accordion type="multiple" defaultValue={["text", "position"]} className="space-y-2">
            {/* Text Styling */}
            <AccordionItem value="text" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                📝 Text Styling
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Font Family</Label>
                    <Select value={settings.fontFamily} onValueChange={(v) => updateSetting('fontFamily', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map(font => (
                          <SelectItem key={font} value={font}>{font}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Font Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        value={settings.fontColor} 
                        onChange={(e) => updateSetting('fontColor', e.target.value)}
                        className="w-16 h-9 p-1 cursor-pointer"
                      />
                      <Input 
                        type="text" 
                        value={settings.fontColor} 
                        onChange={(e) => updateSetting('fontColor', e.target.value)}
                        className="flex-1 h-9 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Font Weight</Label>
                    <Select value={settings.fontWeight} onValueChange={(v) => updateSetting('fontWeight', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_WEIGHTS.map(w => (
                          <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Font Style</Label>
                    <Select value={settings.fontStyle} onValueChange={(v) => updateSetting('fontStyle', v as 'normal' | 'italic')}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="italic">Italic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Text Align</Label>
                    <Select value={settings.textAlign} onValueChange={(v) => updateSetting('textAlign', v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Text Transform</Label>
                    <Select value={settings.textTransform} onValueChange={(v) => updateSetting('textTransform', v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="uppercase">UPPERCASE</SelectItem>
                        <SelectItem value="lowercase">lowercase</SelectItem>
                        <SelectItem value="capitalize">Capitalize</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Font Size: {settings.fontSize}px</Label>
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={([v]) => updateSetting('fontSize', v)}
                      min={40}
                      max={300}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Line Height: {settings.lineHeight}</Label>
                    <Slider
                      value={[settings.lineHeight]}
                      onValueChange={([v]) => updateSetting('lineHeight', v)}
                      min={1.0}
                      max={3.0}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Letter Spacing: {settings.letterSpacing}px</Label>
                    <Slider
                      value={[settings.letterSpacing]}
                      onValueChange={([v]) => updateSetting('letterSpacing', v)}
                      min={-5}
                      max={20}
                      step={1}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Background */}
            <AccordionItem value="background" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                🎨 Background
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Background Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        value={settings.backgroundColor === 'transparent' ? '#000000' : settings.backgroundColor} 
                        onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                        className="w-16 h-9 p-1 cursor-pointer"
                      />
                      <Input 
                        type="text" 
                        value={settings.backgroundColor} 
                        onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                        placeholder="transparent"
                        className="flex-1 h-9 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Opacity: {settings.backgroundOpacity}</Label>
                    <Slider
                      value={[settings.backgroundOpacity]}
                      onValueChange={([v]) => updateSetting('backgroundOpacity', v)}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Padding: {settings.backgroundPadding}px</Label>
                    <Slider
                      value={[settings.backgroundPadding]}
                      onValueChange={([v]) => updateSetting('backgroundPadding', v)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Border Radius: {settings.backgroundRadius}px</Label>
                    <Slider
                      value={[settings.backgroundRadius]}
                      onValueChange={([v]) => updateSetting('backgroundRadius', v)}
                      min={0}
                      max={50}
                      step={5}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Outline/Stroke */}
            <AccordionItem value="outline" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                ✏️ Outline/Stroke
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Outline Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        value={settings.outlineColor} 
                        onChange={(e) => updateSetting('outlineColor', e.target.value)}
                        className="w-16 h-9 p-1 cursor-pointer"
                      />
                      <Input 
                        type="text" 
                        value={settings.outlineColor} 
                        onChange={(e) => updateSetting('outlineColor', e.target.value)}
                        className="flex-1 h-9 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Outline Width: {settings.outlineWidth}px</Label>
                    <Slider
                      value={[settings.outlineWidth]}
                      onValueChange={([v]) => updateSetting('outlineWidth', v)}
                      min={0}
                      max={20}
                      step={1}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Shadow Effects */}
            <AccordionItem value="shadow" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                🌟 Shadow Effects
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Shadow Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        value={settings.shadowColor} 
                        onChange={(e) => updateSetting('shadowColor', e.target.value)}
                        className="w-16 h-9 p-1 cursor-pointer"
                      />
                      <Input 
                        type="text" 
                        value={settings.shadowColor} 
                        onChange={(e) => updateSetting('shadowColor', e.target.value)}
                        className="flex-1 h-9 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Shadow Blur: {settings.shadowBlur}px</Label>
                    <Slider
                      value={[settings.shadowBlur]}
                      onValueChange={([v]) => updateSetting('shadowBlur', v)}
                      min={0}
                      max={50}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Shadow X Offset: {settings.shadowX}px</Label>
                    <Slider
                      value={[settings.shadowX]}
                      onValueChange={([v]) => updateSetting('shadowX', v)}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Shadow Y Offset: {settings.shadowY}px</Label>
                    <Slider
                      value={[settings.shadowY]}
                      onValueChange={([v]) => updateSetting('shadowY', v)}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Positioning */}
            <AccordionItem value="position" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                📍 Positioning
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs">Position Grid</Label>
                  <PositionGridSelector 
                    value={settings.position} 
                    onChange={(v) => updateSetting('position', v)} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">X Offset: {settings.offsetX}px</Label>
                    <Slider
                      value={[settings.offsetX]}
                      onValueChange={([v]) => updateSetting('offsetX', v)}
                      min={-500}
                      max={500}
                      step={10}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Y Offset: {settings.offsetY}px</Label>
                    <Slider
                      value={[settings.offsetY]}
                      onValueChange={([v]) => updateSetting('offsetY', v)}
                      min={-500}
                      max={500}
                      step={10}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label className="text-xs">Max Width: {settings.maxWidth}px</Label>
                    <Slider
                      value={[settings.maxWidth]}
                      onValueChange={([v]) => updateSetting('maxWidth', v)}
                      min={300}
                      max={1000}
                      step={50}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Animation */}
            <AccordionItem value="animation" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                ✨ Animation
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Animation Type</Label>
                    <Select value={settings.animation} onValueChange={(v) => updateSetting('animation', v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ANIMATION_TYPES.map(a => (
                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Duration: {settings.animationDuration}s</Label>
                    <Slider
                      value={[settings.animationDuration]}
                      onValueChange={([v]) => updateSetting('animationDuration', v)}
                      min={0.1}
                      max={2.0}
                      step={0.1}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Language Settings */}
            <AccordionItem value="language" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                🌍 Language Settings
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Subtitles Model</Label>
                    <Select value={settings.subtitlesModel} onValueChange={(v) => updateSetting('subtitlesModel', v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUBTITLES_MODELS.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Language</Label>
                    <Select value={settings.language} onValueChange={(v) => updateSetting('language', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(l => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="secondary" size="sm" onClick={copyJSON}>
            <Copy className="h-4 w-4 mr-2" />
            Copy JSON
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Apply Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
